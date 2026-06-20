import type { SupabaseClient } from '@supabase/supabase-js'
import { todayLocal, toLocalDate } from './streak'

// 本週陪伴洞察：給疲憊家長一個「你做得很好」的情感回饋（次數/天數/最常玩/正向反應率）。
// 純聚合（可單元測試），用既有 companion_logs，雙平台共用。

const DEFAULT_TZ = 'Asia/Taipei'
const POSITIVE_REACTIONS: ReadonlySet<string> = new Set(['happy', 'engaged', 'calmed'])

export class InsightsError extends Error {}

export interface WeeklyInsights {
  sessions: number // 本週陪伴次數
  activeDays: number // 本週有陪的天數（去重）
  topActivityTitle: string | null // 本週最常玩的活動
  positiveReactionRate: number | null // 正向反應比例 0..1（無反應紀錄時 null）
}

export interface InsightRow {
  localDate: string // 'YYYY-MM-DD'（本地時區）
  title: string
  reaction: string | null
}

// 'YYYY-MM-DD' 加減天數（以 UTC 午夜為基準）。
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// companion_activities 關聯在 supabase-js 可能回物件或陣列，統一取 title。
type ActivityJoin = { title: string } | { title: string }[] | null | undefined
function titleFrom(join: ActivityJoin): string {
  if (!join) return '自由陪伴'
  const obj = Array.isArray(join) ? join[0] : join
  return obj?.title || '自由陪伴'
}

/** 由本週紀錄聚合洞察。抽出以便單元測試。 */
export function computeWeeklyInsights(rows: InsightRow[]): WeeklyInsights {
  const sessions = rows.length
  const activeDays = new Set(rows.map((r) => r.localDate)).size

  // 最常玩的活動（同次數取先出現者）
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.title, (counts.get(r.title) ?? 0) + 1)
  let topActivityTitle: string | null = null
  let max = 0
  for (const [title, c] of counts) {
    if (c > max) {
      max = c
      topActivityTitle = title
    }
  }

  // 正向反應比例（neutral 與其他不列入分母？此處：有記錄反應者為分母，正向為分子）
  const reactions = rows.map((r) => r.reaction).filter((x): x is string => Boolean(x))
  const positive = reactions.filter((r) => POSITIVE_REACTIONS.has(r)).length
  const positiveReactionRate = reactions.length > 0 ? positive / reactions.length : null

  return { sessions, activeDays, topActivityTitle, positiveReactionRate }
}

export interface InsightsArgs {
  childId: string
  timeZone?: string
}

/** 取得某孩子「本週（近 7 個本地日）」的陪伴洞察。 */
export async function fetchWeeklyInsights(
  supabase: SupabaseClient,
  args: InsightsArgs,
): Promise<WeeklyInsights> {
  const { childId, timeZone = DEFAULT_TZ } = args
  // 多取一天避免時區邊界遺漏，再用本地日期過濾到 7 天窗。
  const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('companion_logs')
    .select('created_at,child_reaction,companion_activities(title)')
    .eq('child_id', childId)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new InsightsError('無法載入本週洞察')

  const today = todayLocal(timeZone)
  const weekStart = addDays(today, -6) // 含今天的 7 天窗
  const rows: InsightRow[] = (
    (data || []) as {
      created_at: string | null
      child_reaction: string | null
      companion_activities: ActivityJoin
    }[]
  )
    .filter((r): r is typeof r & { created_at: string } => Boolean(r.created_at))
    .map((r) => ({
      localDate: toLocalDate(r.created_at, timeZone),
      title: titleFrom(r.companion_activities),
      reaction: r.child_reaction,
    }))
    .filter((r) => r.localDate >= weekStart && r.localDate <= today)

  return computeWeeklyInsights(rows)
}
