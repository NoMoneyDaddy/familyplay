export const STAGE_KEYS = {
  NEWBORN: 'newborn', // 0–3 個月
  EARLY_INFANT: 'early_infant', // 3–6 個月
  SITTING_BABY: 'sitting_baby', // 6–9 個月
  CRAWLER: 'crawler', // 9–12 個月
  EARLY_WALKER: 'early_walker', // 12–18 個月
  TODDLER_TALKER: 'toddler_talker', // 18–24 個月
  TODDLER_PLAYER: 'toddler_player', // 24–36 個月
  PRESCHOOLER: 'preschooler', // 36–48 個月
  PRESCHOOLER_PLUS: 'preschooler_plus', // 48–60 個月
} as const

export type StageKey = (typeof STAGE_KEYS)[keyof typeof STAGE_KEYS]

export const ALLOWED_STAGE_KEYS = Object.values(STAGE_KEYS) as StageKey[]

export const STAGE_AGE_RANGES: Record<StageKey, { minMonths: number; maxMonths: number }> = {
  newborn: { minMonths: 0, maxMonths: 3 },
  early_infant: { minMonths: 3, maxMonths: 6 },
  sitting_baby: { minMonths: 6, maxMonths: 9 },
  crawler: { minMonths: 9, maxMonths: 12 },
  early_walker: { minMonths: 12, maxMonths: 18 },
  toddler_talker: { minMonths: 18, maxMonths: 24 },
  toddler_player: { minMonths: 24, maxMonths: 36 },
  preschooler: { minMonths: 36, maxMonths: 48 },
  preschooler_plus: { minMonths: 48, maxMonths: 60 },
}

export function getStageKey(ageMonths: number): StageKey {
  if (Number.isNaN(ageMonths)) return 'newborn'
  // Iterate the whitelist in a stable, age-sorted order rather than relying on
  // object-key insertion order.
  const ordered = ALLOWED_STAGE_KEYS.slice().sort(
    (a, b) => STAGE_AGE_RANGES[a].minMonths - STAGE_AGE_RANGES[b].minMonths,
  )
  for (const key of ordered) {
    const range = STAGE_AGE_RANGES[key]
    if (ageMonths >= range.minMonths && ageMonths < range.maxMonths) {
      return key
    }
  }
  // Below the youngest band → newborn; at/above the oldest band → clamp to top.
  return ageMonths < 0 ? 'newborn' : 'preschooler_plus'
}

export function getAgeMonths(birthYearMonth: string): number {
  if (typeof birthYearMonth !== 'string' || !/^\d{4}-\d{2}$/.test(birthYearMonth)) {
    throw new Error(`Invalid birthYearMonth: ${birthYearMonth} (expected YYYY-MM)`)
  }
  const [year, month] = birthYearMonth.split('-').map(Number)
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in birthYearMonth: ${birthYearMonth}`)
  }
  const now = new Date()
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
}
