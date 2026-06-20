import { fetchActiveSponsorCards, SponsorError } from '@familyplay/data'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { getRequestId } from '@/lib/request-id'

// 贊助小卡（house ads）：免費用戶可見的輕量贊助內容；付費去廣告由前端依方案隱藏。
// 公開讀取（RLS anyone_read_active_ads 已限定啟用/時間窗），匿名亦可，故不強制登入。
// placement 白名單避免任意字串打 DB；預設 recommendations。
const PLACEMENTS = ['recommendations', 'history', 'now', 'saved'] as const
const placementSchema = z.enum(PLACEMENTS).default('recommendations')

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return NextResponse.json({ cards: [] })

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })

  const parsed = placementSchema.safeParse(
    new URL(request.url).searchParams.get('placement') ?? undefined,
  )
  // 非白名單版位不報錯、直接回空（贊助內容缺失不該影響頁面）
  const placement = parsed.success ? parsed.data : 'recommendations'

  try {
    const cards = await fetchActiveSponsorCards(supabase, placement)
    return NextResponse.json({ cards })
  } catch (error) {
    // 贊助內容載入失敗只上報、安靜回空（非核心，不打擾使用者）
    if (!(error instanceof SponsorError)) {
      reportError(error, { route: '/api/sponsors', requestId: getRequestId(request) })
    }
    return NextResponse.json({ cards: [] })
  }
}
