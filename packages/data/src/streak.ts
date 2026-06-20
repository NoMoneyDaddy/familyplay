import type { SupabaseClient } from '@supabase/supabase-js'

// 連續陪伴天數（streak）：強化 App 的核心使命——幫家長「持續」陪伴。
// 用既有 companion_logs，純日期邏輯（可單元測試），雙平台共用。

const DEFAULT_TZ = 'Asia/Taipei'

export class StreakError extends Error {}

/** ISO 時間 → 指定時區的本地日期字串（YYYY-MM-DD）。en-CA locale 即輸出此格式。 */
export function toLocalDate(iso: string, timeZone: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** 今天的本地日期字串（YYYY-MM-DD）。 */
export function todayLocal(timeZone: string = DEFAULT_TZ): string {
  return toLocalDate(new Date().toISOString(), timeZone)
}

// 'YYYY-MM-DD' 加減天數（以 UTC 午夜為基準避免 DST 漂移）。
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * 計算「目前連續陪伴天數」：從今天（或昨天，若今天還沒陪）往回數連續有紀錄的天數。
 * 今天還沒紀錄時 streak 仍延續（以昨天為錨），讓家長有一整天可以維持。抽出以便單元測試。
 */
export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates)
  const yesterday = addDays(today, -1)
  let anchor: string
  if (set.has(today)) anchor = today
  else if (set.has(yesterday)) anchor = yesterday
  else return 0

  let streak = 0
  let cur = anchor
  while (set.has(cur)) {
    streak += 1
    cur = addDays(cur, -1)
  }
  return streak
}

export interface StreakArgs {
  childId: string
  timeZone?: string
}

/** 取得某孩子目前的連續陪伴天數（近 120 天窗即足夠涵蓋任何 streak）。 */
export async function fetchStreak(supabase: SupabaseClient, args: StreakArgs): Promise<number> {
  const { childId, timeZone = DEFAULT_TZ } = args
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('companion_logs')
    .select('created_at')
    .eq('child_id', childId)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new StreakError('無法載入陪伴紀錄')

  const dates = ((data || []) as { created_at: string | null }[])
    .map((r) => r.created_at)
    .filter((c): c is string => Boolean(c))
    .map((c) => toLocalDate(c, timeZone))
  return computeStreak(dates, todayLocal(timeZone))
}
