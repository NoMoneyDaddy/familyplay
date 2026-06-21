import { isUnder3 } from '@familyplay/core'
import type { AIInput } from './types'

// 由白名單驗證過的 AIInput 組出 AI 提示。
//
// 安全（CLAUDE.md）：可加入「去識別化的精確年齡（月齡）」讓活動更貼合，但絕不加入
// 孩子姓名或原始出生日期字串。輸出要求嚴格 JSON，方便後端解析；系統提示明確禁止
// 醫療診斷、危險素材、外部連結，並要求繁體中文、語氣溫暖、步驟可立即執行。

// 月齡 → 自然語年齡描述（去識別化，不含生日）。
function agePhrase(months: number): string {
  if (months < 12) return `${months} 個月大`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m === 0 ? `${y} 歲` : `${y} 歲 ${m} 個月`
}

const STAGE_DESC: Record<string, string> = {
  newborn: '新生兒（0–3 個月）',
  early_infant: '早期嬰兒（3–6 個月）',
  sitting_baby: '會坐的寶寶（6–9 個月）',
  crawler: '爬行期（9–12 個月）',
  early_walker: '學步期（12–18 個月）',
  toddler_talker: '學語期（18–24 個月）',
  toddler_player: '探索期（24–36 個月）',
  preschooler: '學齡前（36–48 個月）',
  preschooler_plus: '學齡前（48–60 個月）',
}

const COMPANION_DESC: Record<string, string> = {
  play: '一起玩',
  talk: '聊天互動',
  read: '共讀',
  outdoor: '戶外活動',
  creative: '創作',
  sensory: '感官探索',
  music: '音樂律動',
  calm_down: '安撫平靜',
}

const SPACE_DESC: Record<string, string> = {
  anywhere: '任何地方',
  living_room: '客廳',
  bedroom: '臥室',
  kitchen: '廚房',
  outdoor_yard: '院子',
  park: '公園',
  car: '車上',
  waiting_area: '等候區',
}

const RESOURCE_DESC: Record<string, string> = {
  none: '不需道具',
  books: '書',
  blocks: '積木',
  balls: '球',
  paper_crayons: '紙和蠟筆',
  cushions: '抱枕',
  music: '音樂',
  water: '水',
  kitchen_items: '廚房用品',
}

const ENERGY_DESC: Record<string, string> = {
  low: '很累、只想要低負擔',
  medium: '還行',
  high: '精力不錯',
}

/** AI 必須回傳的活動 JSON 形狀（後端會再做 schema 驗證 + Safety Filter）。 */
export interface GeneratedActivity {
  title: string
  openingLine: string
  steps: string[]
  followUpQuestions: string[]
  endingLine: string
}

const asStringArray = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, max)
    : []

/**
 * 解析 AI 回傳的活動 JSON，並驗證/正規化成 GeneratedActivity。
 *
 * 即使開了原生 JSON mode，仍防禦性處理：去掉可能的 ```json markdown 圍欄、JSON.parse、
 * 檢查必要欄位（title + 至少一個 step）。任何不合規一律回 null，呼叫端據此降回規則式。
 */
export function parseGeneratedActivity(content: string): GeneratedActivity | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let raw: unknown
  try {
    raw = JSON.parse(cleaned)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const steps = asStringArray(o.steps, 8)
  if (!title || steps.length === 0) return null

  return {
    title: title.slice(0, 40),
    openingLine: typeof o.openingLine === 'string' ? o.openingLine.slice(0, 200) : '',
    steps,
    followUpQuestions: asStringArray(o.followUpQuestions, 5),
    endingLine: typeof o.endingLine === 'string' ? o.endingLine.slice(0, 200) : '',
  }
}

/**
 * 把 AI 回傳的交接短評正規化：去掉 markdown 圍欄、壓成單一段落、限長。
 * 任何空白/全被清掉 → 回 null，呼叫端據此降回規則式摘要。
 * 安全：內容已先過 Safety Filter（checkSafety）；此處只做形狀整理。
 */
export function sanitizeHandoffSummary(content: string): string | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:\w+)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  // 交接短評刻意短：限 200 字，過長截斷在最後一個句號處（避免半句）。
  if (cleaned.length <= 200) return cleaned
  const capped = cleaned.slice(0, 200)
  const lastStop = Math.max(capped.lastIndexOf('。'), capped.lastIndexOf('！'))
  return lastStop >= 80 ? capped.slice(0, lastStop + 1) : capped
}

/**
 * 交接小卡的「AI 溫暖短評」提示。
 *
 * 安全（CLAUDE.md）：輸入沿用與活動生成「完全相同」的白名單欄位（只用到 stageKey 與
 * capabilityKeys，皆已驗證），不新增任何資料面——絕不含暱稱/生日/紀錄原文。
 * 輸出為純文字（非 JSON）：給接手家人看的 2–3 句溫暖現況短評，禁醫療診斷與外部連結。
 */
export function buildHandoffPrompt(input: AIInput): {
  system: string
  user: string
  maxTokens: number
} {
  const system = [
    '你是「FamilyPlay」的親子陪伴夥伴，正在幫家長寫一張「交接小卡」的開場短評，',
    '讓接手照顧的家人（另一半、長輩、保母）30 秒內溫暖地進入狀況。',
    '規則：',
    '1. 一律用繁體中文，語氣溫暖、體貼、像家人之間的提醒。',
    '2. 只寫 2–3 句、最多 120 字的「現況短評」，不要條列、不要標題。',
    '3. 不要提供任何醫療、診斷、發展遲緩評估或治療建議；不要用「應該/必須」施壓。',
    '4. 不要包含任何網址、連結或外部資源。',
    '5. 不要編造具體事件或孩子的名字，只根據下面提供的「發展階段」與「正在發展的能力」來寫。',
    '6. 只輸出短評本身，不要加引號、說明文字或 markdown。',
  ].join('\n')

  const developing =
    input.capabilityKeys.length > 0
      ? `孩子正在發展中的能力：${input.capabilityKeys.join('、')}。`
      : '目前沒有特別標記的發展能力。'

  const user = [
    input.ageMonths !== undefined
      ? `孩子的發展階段：${STAGE_DESC[input.stageKey] ?? input.stageKey}，目前約 ${agePhrase(input.ageMonths)}。`
      : `孩子的發展階段：${STAGE_DESC[input.stageKey] ?? input.stageKey}。`,
    developing,
    '請寫一段溫暖的交接現況短評，讓接手的家人安心、知道現在可以多陪孩子練什麼。',
  ].join('\n')

  return { system, user, maxTokens: 240 }
}

export function buildActivityPrompt(input: AIInput): {
  system: string
  user: string
  maxTokens: number
} {
  // 用 core 的單一安全來源判斷 0–3 歲高風險階段，避免與規則式引擎的分類漂移
  const under3 = isUnder3(input.stageKey)

  const system = [
    '你是「FamilyPlay」的親子陪伴設計師，專門為疲憊的家長設計「現在就能做」的親子陪伴小活動。',
    '規則：',
    '1. 一律用繁體中文，語氣溫暖、口語、像在跟朋友說話。',
    '2. 活動要安全、適齡、低門檻，家長看完就能立刻開始。',
    under3
      ? '3. 這是 0–3 歲幼兒，嚴禁任何小零件、可吞嚥物、有窒息風險的素材或玩法。'
      : '3. 注意年齡安全，避免危險動作或素材。',
    '4. 不要提供任何醫療、診斷、發展遲緩評估或治療建議。',
    '5. 不要包含任何網址、連結或外部資源。',
    '6. 只輸出 JSON，不要加說明文字或 markdown 圍欄。',
    'JSON 格式：{"title":"活動名稱(8字內)","openingLine":"對孩子說的一句開場白","steps":["步驟1","步驟2","步驟3"],"followUpQuestions":["可以問孩子的問題1","問題2"],"endingLine":"溫柔的收尾語"}',
  ].join('\n')

  const developing =
    input.capabilityKeys.length > 0
      ? `這個孩子正在發展中的能力（可作為設計參考、不用逐一對應）：${input.capabilityKeys.join('、')}。`
      : '目前沒有特別標記的發展能力，給通用的適齡活動即可。'

  const user = [
    input.ageMonths !== undefined
      ? `孩子發展階段：${STAGE_DESC[input.stageKey] ?? input.stageKey}，目前約 ${agePhrase(input.ageMonths)}。`
      : `孩子發展階段：${STAGE_DESC[input.stageKey] ?? input.stageKey}。`,
    `家長現在的狀態：${ENERGY_DESC[input.parentEnergy]}。`,
    `想要的陪伴類型：${COMPANION_DESC[input.companionType] ?? input.companionType}。`,
    `地點：${SPACE_DESC[input.spaceContext] ?? input.spaceContext}。`,
    `手邊資源：${input.availableResources.map((r) => RESOURCE_DESC[r] ?? r).join('、') || '不限'}。`,
    developing,
    '請設計「一個」最適合現在的陪伴活動，3–5 個步驟，並用上面的 JSON 格式回覆。',
  ].join('\n')

  return { system, user, maxTokens: 600 }
}
