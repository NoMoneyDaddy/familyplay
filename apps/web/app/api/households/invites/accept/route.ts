import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/ratelimit'

const schema = z.object({
  code: z.string().min(1),
})

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  // 邀請碼為 8 碼、30 天有效；節流以防暴力猜碼（猜中即加入他人家庭、看到孩子 PII）。
  const rl = await checkRateLimit(`invite-accept:${user.id}`, 5)
  if (!rl.success) {
    return NextResponse.json({ error: '嘗試過於頻繁，請稍後再試' }, { status: 429 })
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
        already_member: { status: 400, message: '你已經是這個家庭的成員' },
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
