import type { ChildReaction, Outcome } from './log'

// 自然語言記錄（白皮書 AI3，隱私安全版）：把家長自己打的一句話
// （如「波波今天玩積木玩超久很開心」）在**本地**解析成結構化記錄草稿，
// 讓使用者一鍵確認，降低記錄摩擦。
//
// 隱私鐵律：此函式 100% 純本地字串比對，**絕不把文字送到任何 AI／外部服務**
// （家長自由文字可能含暱稱/生日，依 CLAUDE.md 不得外送）。只回「建議值」，
// 仍由使用者在 UI 最終確認；比對不到就回 null，不亂猜。

export interface LogCandidate {
  id: string
  title: string
}

export interface ParsedLog {
  activityId: string | null
  activityTitle: string | null
  outcome: Outcome | null
  reaction: ChildReaction | null
}

// 關鍵字 → 結果。順序即優先序（先命中者勝）。皆為繁體中文口語常見說法。
const OUTCOME_RULES: [Outcome, string[]][] = [
  [
    'completed',
    [
      '玩完',
      '做完',
      '完成',
      '玩好久',
      '玩很久',
      '玩超久',
      '玩了好久',
      '一直玩',
      '弄完',
      '順利',
      '玩到一半睡',
      '整個玩完',
    ],
  ],
  [
    'abandoned',
    [
      '不玩了',
      '玩不下去',
      '沒興趣',
      '不想玩',
      '不要玩',
      '放棄',
      '中途',
      '一下就不',
      '馬上就不',
      '沒多久就',
      '玩一下下',
      '一下下就',
    ],
  ],
  ['tried', ['試了', '試試', '有玩', '玩了一下', '玩一下', '稍微玩', '稍微']],
]

const REACTION_RULES: [ChildReaction, string[]][] = [
  [
    'happy',
    ['開心', '很開心', '超開心', '笑', '喜歡', '高興', '好愛', '超愛', '好玩', '哈哈', '愛上'],
  ],
  [
    'engaged',
    ['專心', '投入', '認真', '一直玩', '玩很久', '玩超久', '停不下來', '專注', '沉迷', '很投入'],
  ],
  ['calmed', ['冷靜', '安靜下來', '平靜', '睡著', '放鬆', '安撫', '穩定下來', '不哭了', '情緒穩']],
  [
    // 注意：不放單獨「不要」——它是極常見子字串，會把「玩到不要不要的」（口語＝超起勁，正向）
    // 誤標成負面反應，污染 Step 8 反應自適應的長期訓練訊號。用更明確的說法。
    'leaving',
    ['跑掉', '走開', '離開', '跑走', '不要玩了', '閃人', '大哭', '哭鬧', '生氣', '番', '不耐'],
  ],
  ['disinterested', ['沒興趣', '無聊', '不想', '興趣缺缺', '沒反應', '發呆', '冷淡']],
]

function firstMatch<T>(text: string, rules: [T, string[]][]): T | null {
  for (const [value, keywords] of rules) {
    if (keywords.some((k) => text.includes(k))) return value
  }
  return null
}

// 活動比對：標題為文字子字串 → 直接命中；否則用「標題去重字元」在文字中的覆蓋率，
// 需至少 2 個字元命中且覆蓋率 ≥ 0.5，避免單一常見字（如「玩」）造成誤判。
function matchActivity(text: string, candidates: LogCandidate[]): LogCandidate | null {
  let best: { c: LogCandidate; score: number } | null = null
  for (const c of candidates) {
    const title = c.title.trim()
    if (!title) continue
    if (text.includes(title)) return c // 完整標題出現 → 最強訊號，立即回
    const chars = [...new Set(title.replace(/\s+/g, '').split(''))]
    if (chars.length === 0) continue
    const matched = chars.filter((ch) => text.includes(ch)).length
    const coverage = matched / chars.length
    if (matched >= 2 && coverage >= 0.5) {
      if (!best || coverage > best.score) best = { c, score: coverage }
    }
  }
  return best?.c ?? null
}

/**
 * 把一句自然語言解析成記錄草稿（activity / outcome / reaction），全在本地、不送 AI。
 * 任一維度比對不到就回 null（讓使用者自己選，不亂填）。
 */
export function parseNaturalLog(text: string, candidates: LogCandidate[] = []): ParsedLog {
  const t = (text || '').trim()
  if (!t) return { activityId: null, activityTitle: null, outcome: null, reaction: null }
  const activity = matchActivity(t, candidates)
  return {
    activityId: activity?.id ?? null,
    activityTitle: activity?.title ?? null,
    outcome: firstMatch(t, OUTCOME_RULES),
    reaction: firstMatch(t, REACTION_RULES),
  }
}
