import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getApiSupabase } from '@/lib/supabase/api'

// 刪除帳號：刪除登入者的 auth 使用者，並經 FK CASCADE 清除其所有資料
// （user_profiles → 擁有的家庭 → 孩子/紀錄/邀請/成員/entitlements…）。
// 需要 service role（一般使用者無法刪自己的 auth.users）。
export async function DELETE() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = await getApiSupabase()

  if (!url || !serviceKey || !supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('Failed to delete account', deleteError)
    return NextResponse.json({ error: '刪除帳號失敗，請稍後再試' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
