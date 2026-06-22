// 每日本地陪伴提醒的「純」邏輯（無 expo 依賴、可測試）。
// 在裝置上排程一則每日通知，溫柔提醒家長「今天陪孩子玩一下」。不需後端、不送任何資料。

export const DEFAULT_REMINDER_HOUR = 20 // 晚上 8 點，多數家庭的親子時段

/** 把任意輸入夾到合法的「小時」(0–23 整數)；非法則回預設。 */
export function clampHour(h: unknown): number {
  const n = typeof h === 'number' ? Math.floor(h) : Number.NaN
  if (!Number.isFinite(n) || n < 0 || n > 23) return DEFAULT_REMINDER_HOUR
  return n
}

/** 顯示用時間字串（24 小時制 HH:00）。 */
export function formatHour(h: number): string {
  return `${String(clampHour(h)).padStart(2, '0')}:00`
}

// 提醒文案（輪流取一，避免每天一樣）。不含孩子個資。
export const REMINDER_BODIES: readonly string[] = [
  '花 30 秒，陪孩子玩一個小遊戲吧 🧡',
  '今天還沒陪玩嗎？打開看看現在能玩什麼～',
  '一個小活動，就能讓今天不一樣。',
  '累了也沒關係，挑個安靜的小遊戲一起放鬆。',
]

/** 依日期序挑一則提醒文案（穩定、可測試；不需亂數）。 */
export function pickReminderBody(
  dayIndex: number,
  bodies: readonly string[] = REMINDER_BODIES,
): string {
  if (bodies.length === 0) return ''
  const i = ((Math.floor(dayIndex) % bodies.length) + bodies.length) % bodies.length
  return bodies[i]
}
