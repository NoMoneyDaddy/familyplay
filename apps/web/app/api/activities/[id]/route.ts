import { CAPABILITY_LABELS } from '@familyplay/assessment'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'

// 活動 id 是 UUID；非 UUID（空字串、合成 fallback id 等）一律當「找不到」處理，
// 既符合「所有輸入先驗證」的規範，也避免把畸形 id 丟給 uuid 欄位查詢觸發 DB 錯誤。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, requestId } = auth

  // 只取回應實際用到的欄位，別 select('*')：companion_activities 有多個大 JSONB／陣列欄
  // （description、required/optional_capabilities、season/holiday_tags…）回應根本不需要，
  // 全抓會放大 DB→API 記憶體與序列化成本。
  const { data: activity, error } = await supabase
    .from('companion_activities')
    .select(
      'id,title,opening_line,steps,follow_up_questions,ending_line,min_duration_minutes,max_duration_minutes,safety_notes,developmental_focus,zpd_targets',
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  // 用 maybeSingle 區分「查詢失敗」與「查無資料」：error 代表真的後端/RLS 故障，
  // 上報 Sentry 並回 500（別偽裝成 404 把告警吃掉）；查無資料才回 404。
  if (error) {
    reportError(error, { route: '/api/activities/[id]', requestId })
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  // zpd_targets 存的是能力 key 的 camelCase 值（如 canRoll）；用 CAPABILITY_LABELS 映射成
  // 中文標籤（如「翻身」），白名單外的 key 丟棄，讓家長看到「會練到什麼」。
  const targetSkills = ((activity.zpd_targets as string[] | null) || [])
    .map((k) => CAPABILITY_LABELS[k])
    .filter(Boolean)

  return NextResponse.json({
    id: activity.id,
    title: activity.title,
    openingLine: activity.opening_line,
    steps: activity.steps || [],
    followUpQuestions: activity.follow_up_questions || [],
    endingLine: activity.ending_line,
    minDurationMinutes: activity.min_duration_minutes,
    maxDurationMinutes: activity.max_duration_minutes,
    safetyNotes: activity.safety_notes,
    developmentalFocus: activity.developmental_focus || [],
    targetSkills,
  })
}
