import type { SupabaseClient } from '@supabase/supabase-js'
import { type ProfileResolveKind, resolveProfileId } from './profile'

// 成長紀錄（身高/體重/頭圍）：時間序列，每次量測一列。created_by 由 DB 推出（不信任前端），
// household 歸屬由 child_id → RLS 把關（僅本家庭成員可讀、caregiver/owner 可寫）。
// 跨平台共用：Web 與行動端各自帶 session 的 client。

export class GrowthError extends Error {}

const growthProfileError = (kind: ProfileResolveKind) =>
  new GrowthError(kind === 'unauthorized' ? '尚未登入' : '找不到使用者資料')

export interface GrowthMeasurement {
  id: string
  measuredOn: string | null
  heightCm: number | null
  weightKg: number | null
  headCircCm: number | null
  createdAt: string | null
}

export interface GrowthRow {
  id: string
  measured_on: string | null
  height_cm: number | string | null
  weight_kg: number | string | null
  head_circ_cm: number | string | null
  created_at: string | null
}

// NUMERIC 在 PostgREST 可能回字串；統一轉 number|null。
const num = (v: number | string | null): number | null =>
  v === null || v === undefined ? null : typeof v === 'number' ? v : Number(v)

/** DB 列 → GrowthMeasurement。抽出以便單元測試。 */
export function mapGrowthRow(row: GrowthRow): GrowthMeasurement {
  return {
    id: row.id,
    measuredOn: row.measured_on,
    heightCm: num(row.height_cm),
    weightKg: num(row.weight_kg),
    headCircCm: num(row.head_circ_cm),
    createdAt: row.created_at,
  }
}

/** 列出某孩子的成長紀錄（新到舊）。 */
export async function fetchGrowth(
  supabase: SupabaseClient,
  childId: string,
): Promise<GrowthMeasurement[]> {
  const { data, error } = await supabase
    .from('child_growth_measurements')
    .select('id,measured_on,height_cm,weight_kg,head_circ_cm,created_at')
    .eq('child_id', childId)
    .order('measured_on', { ascending: false })
    .limit(50)
  if (error) throw new GrowthError('無法載入成長紀錄')
  return ((data || []) as GrowthRow[]).map(mapGrowthRow)
}

/**
 * 新增一筆成長量測，回傳新 id。created_by 由 DB 推出，不信任前端。
 * 至少要有一個量測值（身高/體重/頭圍），否則丟 GrowthError（與 DB CHECK 一致、提前擋）。
 */
export async function recordGrowth(
  supabase: SupabaseClient,
  args: {
    childId: string
    measuredOn?: string
    heightCm?: number | null
    weightKg?: number | null
    headCircCm?: number | null
  },
): Promise<string> {
  const { childId, measuredOn, heightCm = null, weightKg = null, headCircCm = null } = args
  if (heightCm == null && weightKg == null && headCircCm == null) {
    throw new GrowthError('至少要填一個量測值')
  }

  const profileId = await resolveProfileId(supabase, growthProfileError)

  const { data, error } = await supabase
    .from('child_growth_measurements')
    .insert({
      child_id: childId,
      created_by: profileId,
      ...(measuredOn ? { measured_on: measuredOn } : {}),
      height_cm: heightCm,
      weight_kg: weightKg,
      head_circ_cm: headCircCm,
    })
    .select('id')
    .single()
  if (error || !data) throw new GrowthError('儲存失敗，請稍後再試')
  return data.id as string
}
