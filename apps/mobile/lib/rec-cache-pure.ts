import type { RecommendedActivity } from '@familyplay/data'

// /now 離線回放的「純」邏輯（無 expo 依賴，方便在 node/vitest 測試）。
// 只快取「畫面實際會用到」的欄位（控制大小，避免超過 SecureStore 單值上限）。
export interface CachedRec {
  id: string
  title: string
  developmentalFocus: string[]
  minDurationMinutes: number | null
  maxDurationMinutes: number | null
  stimulationLevel: string | null
  reasons: string[]
}

/** 從完整推薦取出要快取的子集（畫面用欄位）。 */
export function toCachedRec(rec: RecommendedActivity): CachedRec {
  return {
    id: rec.id,
    title: rec.title,
    developmentalFocus: rec.developmentalFocus ?? [],
    minDurationMinutes: rec.minDurationMinutes ?? null,
    maxDurationMinutes: rec.maxDurationMinutes ?? null,
    stimulationLevel: rec.stimulationLevel ?? null,
    reasons: rec.reasons ?? [],
  }
}

/** 解析 + 最小驗證快取字串：結構漂移/殘缺時回 null（避免渲染時 throw 白屏）。純函式，便於測試。 */
export function parseCachedRec(raw: string | null | undefined): CachedRec | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<CachedRec>
    if (!o || typeof o.id !== 'string' || typeof o.title !== 'string') return null
    if (!Array.isArray(o.reasons) || !Array.isArray(o.developmentalFocus)) return null
    return {
      id: o.id,
      title: o.title,
      developmentalFocus: o.developmentalFocus.filter((x): x is string => typeof x === 'string'),
      minDurationMinutes: typeof o.minDurationMinutes === 'number' ? o.minDurationMinutes : null,
      maxDurationMinutes: typeof o.maxDurationMinutes === 'number' ? o.maxDurationMinutes : null,
      stimulationLevel: typeof o.stimulationLevel === 'string' ? o.stimulationLevel : null,
      reasons: o.reasons.filter((x): x is string => typeof x === 'string'),
    }
  } catch {
    return null
  }
}
