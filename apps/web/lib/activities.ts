// 從 Supabase companion_activities 載入活動，並對應成推薦引擎的 Activity。
//
// 設計原則（對齊 CLAUDE.md）：
// - 走 @supabase/ssr 的使用者 session（RLS 生效），不使用 service role 繞過 RLS。
// - 未登入 / 缺環境變數 / 任何錯誤 → 回傳 null，呼叫端改用內建活動庫（保底）。
// - next/headers 與 @supabase/ssr 以動態 import 載入，讓純對應函式可在 Node 測試環境直接使用。

import type { Activity, CapabilityKey, StimulationLevel } from '@familyplay/core'

export interface ActivityRow {
  id: string
  title: string
  opening_line: string
  steps: unknown
  description?: string | null
  safety_notes?: string | null
  min_age_months: number | null
  max_age_months: number | null
  required_capabilities: string[] | null
  optional_capabilities: string[] | null
  zpd_targets: string[] | null
  stimulation_level: string | null
  required_resources: string[] | null
  space_requirement: string | null
  min_duration_minutes: number | null
  max_duration_minutes: number | null
  is_bedtime_safe: boolean | null
  is_sick_day_safe: boolean | null
  companion_type: string | null
  is_fallback: boolean | null
  is_active: boolean | null
}

const STIMULATION_LEVELS: StimulationLevel[] = ['low', 'medium', 'high']

export const ACTIVITY_COLUMNS = [
  'id',
  'title',
  'opening_line',
  'steps',
  'description',
  'safety_notes',
  'min_age_months',
  'max_age_months',
  'required_capabilities',
  'optional_capabilities',
  'zpd_targets',
  'stimulation_level',
  'required_resources',
  'space_requirement',
  'min_duration_minutes',
  'max_duration_minutes',
  'is_bedtime_safe',
  'is_sick_day_safe',
  'companion_type',
  'is_fallback',
  'is_active',
].join(', ')

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/** 純函式：資料庫列 → 推薦引擎 Activity（snake_case → camelCase，含安全預設值）。 */
export function mapRowToActivity(row: ActivityRow): Activity {
  const stimulationLevel = STIMULATION_LEVELS.includes(row.stimulation_level as StimulationLevel)
    ? (row.stimulation_level as StimulationLevel)
    : 'low'

  return {
    id: row.id,
    title: row.title,
    openingLine: row.opening_line,
    steps: toStringArray(row.steps),
    description: row.description ?? undefined,
    safetyNotes: row.safety_notes ?? undefined,
    minAgeMonths: row.min_age_months ?? undefined,
    maxAgeMonths: row.max_age_months ?? undefined,
    requiredCapabilities: toStringArray(row.required_capabilities) as CapabilityKey[],
    optionalCapabilities: toStringArray(row.optional_capabilities) as CapabilityKey[],
    zpdTargets: toStringArray(row.zpd_targets) as CapabilityKey[],
    stimulationLevel,
    requiredResources: toStringArray(row.required_resources),
    spaceRequirement: row.space_requirement ?? 'anywhere',
    minDurationMinutes: row.min_duration_minutes ?? 5,
    maxDurationMinutes: row.max_duration_minutes ?? 30,
    isBedtimeSafe: row.is_bedtime_safe ?? undefined,
    isSickDaySafe: row.is_sick_day_safe ?? undefined,
    companionType: row.companion_type ?? undefined,
    isFallback: row.is_fallback ?? false,
    isActive: row.is_active ?? true,
  }
}

/**
 * 以登入使用者的 session 從 Supabase 載入啟用中的活動（RLS 生效）。
 * 任何失敗（未登入、未設定、查詢錯誤）都回傳 null，呼叫端據此降級到內建活動庫。
 * 以動態 import 載入伺服器 client，讓 mapRowToActivity 可在 Node 測試環境直接使用。
 */
export async function loadActivitiesFromDb(): Promise<Activity[] | null> {
  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('companion_activities')
      .select(ACTIVITY_COLUMNS)
      .eq('is_active', true)

    if (error || !data || data.length === 0) return null
    return (data as unknown as ActivityRow[]).map(mapRowToActivity)
  } catch {
    return null
  }
}
