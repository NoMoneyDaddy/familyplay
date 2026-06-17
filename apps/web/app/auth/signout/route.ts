import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
  // 303 讓 POST 後改用 GET 導回首頁
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
