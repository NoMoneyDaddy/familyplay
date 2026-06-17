import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1),
})

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code } = schema.parse(body)

    // RLS 下受邀者「還不是成員」，無法直接讀邀請或更新 used_at；
    // 改呼叫 SECURITY DEFINER 函式原子化完成查驗 → 加入成員 → 標記已用。
    const { data: householdId, error: rpcError } = await supabase.rpc('accept_household_invite', {
      invite_code: code.trim().toUpperCase(),
    })

    if (rpcError) {
      const map: Record<string, { status: number; message: string }> = {
        invalid_code: { status: 400, message: '邀請碼無效' },
        expired: { status: 400, message: '邀請已過期' },
        already_used: { status: 400, message: '邀請碼已被使用' },
        unauthorized: { status: 401, message: 'Unauthorized' },
      }
      const hit = map[rpcError.message]
      if (hit) {
        return NextResponse.json({ error: hit.message }, { status: hit.status })
      }
      return NextResponse.json({ error: '無法接受邀請，請稍後再試' }, { status: 500 })
    }

    return NextResponse.json({
      householdId,
      message: 'Successfully joined household',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
