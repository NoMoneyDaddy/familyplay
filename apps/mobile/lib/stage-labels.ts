// 發展階段 → 中文友善標籤（家長看得懂），避免畫面出現 crawler 之類的英文 key。
// 與 apps/web/lib/stage-labels.ts 同一份對照（全平台一致）。
const STAGE_LABELS: Record<string, string> = {
  newborn: '新生兒 · 0–3 個月',
  early_infant: '翻身期 · 3–6 個月',
  sitting_baby: '坐立期 · 6–9 個月',
  crawler: '爬行期 · 9–12 個月',
  early_walker: '學步期 · 12–18 個月',
  toddler_talker: '學語期 · 18–24 個月',
  toddler_player: '探索期 · 24–36 個月',
  preschooler: '學齡前 · 36–48 個月',
  preschooler_plus: '學齡前 · 48–60 個月',
}

export function stageLabel(stageKey?: string | null): string | null {
  if (!stageKey) return null
  return STAGE_LABELS[stageKey] ?? null
}
