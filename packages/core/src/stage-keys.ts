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
  if (!Number.isFinite(ageMonths)) {
    throw new RangeError(`ageMonths must be a finite number, got ${String(ageMonths)}`)
  }
  for (const [key, range] of Object.entries(STAGE_AGE_RANGES)) {
    if (ageMonths >= range.minMonths && ageMonths < range.maxMonths) {
      return key as StageKey
    }
  }
  return ageMonths < 0 ? 'newborn' : 'preschooler_plus'
}

const BIRTH_YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function getAgeMonths(birthYearMonth: string): number {
  if (!BIRTH_YEAR_MONTH_RE.test(birthYearMonth)) {
    throw new RangeError(
      `birthYearMonth must match YYYY-MM format (01–12), got "${birthYearMonth}"`,
    )
  }
  const [year, month] = birthYearMonth.split('-').map(Number)
  const now = new Date()
  const ageMonths = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  if (ageMonths < 0) {
    throw new RangeError(`birthYearMonth "${birthYearMonth}" is in the future`)
  }
  return ageMonths
}
