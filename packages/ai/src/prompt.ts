import { isUnder3 } from '@familyplay/core'
import type { AIInput } from './types'

// 由白名單驗證過的 AIInput 組出 AI 提示。
//
// 安全（CLAUDE.md）：AIInput 本身不含孩子暱稱/生日，這裡也絕不加入任何個資。
// 輸出要求嚴格 JSON，方便後端解析；系統提示明確禁止醫療診斷、危險素材、外部連結，
// 並要求繁體中文、語氣溫暖、步驟可立即執行。

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
    `孩子發展階段：${STAGE_DESC[input.stageKey] ?? input.stageKey}。`,
    `家長現在的狀態：${ENERGY_DESC[input.parentEnergy]}。`,
    `想要的陪伴類型：${COMPANION_DESC[input.companionType] ?? input.companionType}。`,
    `地點：${SPACE_DESC[input.spaceContext] ?? input.spaceContext}。`,
    `手邊資源：${input.availableResources.map((r) => RESOURCE_DESC[r] ?? r).join('、') || '不限'}。`,
    developing,
    '請設計「一個」最適合現在的陪伴活動，3–5 個步驟，並用上面的 JSON 格式回覆。',
  ].join('\n')

  return { system, user, maxTokens: 600 }
}
