import { fetchSaved, SavedError } from '@familyplay/data'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/ratelimit'

const bodySchema = z.object({ activityId: z.string().uuid() })

// 個人收藏（save for later）：綁 user_profile，RLS 僅本人可讀寫。
async function resolveProfileId(supabase: SupabaseClient, authUserId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()
  return data?.id as string | undefined
}

// 列出收藏（含活動內容），新到舊。映射收斂到 @familyplay/data（fetchSaved/mapSavedRow），
// 與行動端共用、消除前端 pickActivity 的重複關聯處理。
export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  try {
    const saved = await fetchSaved(supabase)
    return NextResponse.json({ saved })
  } catch (error) {
    if (error instanceof SavedError) {
      return NextResponse.json({ error: 'Failed to load saved' }, { status: 500 })
    }
    throw error
  }
}

// 收藏一個活動（重複收藏視為成功，靠 UNIQUE 去重）。
export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const rl = await checkRateLimit(`saved-write:${user.id}`, 60)
  if (!rl.success) return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })

  let activityId: string
  try {
    activityId = bodySchema.parse(await request.json()).activityId
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const profileId = await resolveProfileId(supabase, user.id)
  if (!profileId) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

  const { error } = await supabase
    .from('saved_activities')
    .upsert(
      { user_profile_id: profileId, activity_id: activityId },
      { onConflict: 'user_profile_id,activity_id', ignoreDuplicates: true },
    )
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  return NextResponse.json({ saved: true })
}

// 取消收藏。RLS 已限制只能刪自己的，仍顯式比對 activity_id。
export async function DELETE(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const rl = await checkRateLimit(`saved-write:${user.id}`, 60)
  if (!rl.success) return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })

  const activityId = new URL(request.url).searchParams.get('activityId')
  if (!activityId || !z.string().uuid().safeParse(activityId).success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // RLS 已限制只能刪自己的；仍顯式比對 user_profile_id，讓擁有權檢查在程式碼層自我說明、好稽核。
  const profileId = await resolveProfileId(supabase, user.id)
  if (!profileId) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

  const { error } = await supabase
    .from('saved_activities')
    .delete()
    .eq('user_profile_id', profileId)
    .eq('activity_id', activityId)
  if (error) return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  return NextResponse.json({ saved: false })
}
