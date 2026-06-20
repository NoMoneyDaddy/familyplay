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

export interface StreakInfo {
  streak: number
  /** 是否動用了「寬限日」（中間漏接一天被原諒）。給 UI 顯示 ❄️ 寬限提示用。 */
  graceUsed: boolean
}

/**
 * 計算「目前連續陪伴天數」，含**一天寬限**（grace，預設 1）：
 * 中間漏接「一天」不會讓 streak 歸零（損失趨避——別讓家長因偶爾漏一天就前功盡棄），
 * 但漏掉的那天本身不計入天數。連續漏兩天（超過寬限）才真正中斷。
 * 今天還沒紀錄時 streak 仍以昨天為錨延續（給家長一整天可維持）。抽出以便單元測試。
 */
export function computeStreakInfo(dates: string[], today: string, grace = 1): StreakInfo {
  const set = new Set(dates)
  let cur = today
  // 今天還沒陪不算中斷、也不計數：直接往前一天當起點（不花寬限）。
  if (!set.has(cur)) cur = addDays(cur, -1)

  let streak = 0
  let gracesLeft = grace
  let graceUsed = false
  let pendingGrace = false // 剛花了寬限、但還沒確認後面是否真的連著
  while (true) {
    if (set.has(cur)) {
      streak += 1
      // 花掉的寬限後面真的接到一天 → 才算「寬限橋接成功」（結尾無效寬限不標）
      if (pendingGrace) {
        graceUsed = true
        pendingGrace = false
      }
      cur = addDays(cur, -1)
    } else if (gracesLeft > 0) {
      // 橋接單天空缺：花一次寬限、不計數，繼續往前看是否還連著。
      gracesLeft -= 1
      pendingGrace = true
      cur = addDays(cur, -1)
    } else {
      break
    }
  }
  return { streak, graceUsed }
}

/** 目前連續陪伴天數（含一天寬限）。 */
export function computeStreak(dates: string[], today: string, grace = 1): number {
  return computeStreakInfo(dates, today, grace).streak
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
