import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/ratelimit'

const schema = z.object({
  householdId: z.string().uuid(),
  role: z.enum(['caregiver', 'viewer']),
})

function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const charsLen = chars.length
  let token = ''
  const randomValues = new Uint8Array(8)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < 8; i++) {
    // Rejection sampling: discard values that would cause modulo bias
    let val = randomValues[i]
    const limit = 256 - (256 % charsLen)
    while (val >= limit) {
      val = crypto.getRandomValues(new Uint8Array(1))[0]
    }
    token += chars[val % charsLen]
  }
  return token
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const rl = await checkRateLimit(`invite-generate:${user.id}`, 10)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { householdId, role } = schema.parse(body)

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_profile_id', userProfile.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
    }

    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .insert({
        household_id: householdId,
        token,
        role,
        created_by: userProfile.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('token')
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // 安全：優先用可信的 NEXT_PUBLIC_APP_URL，避免攻擊者偽造 x-forwarded-host 讓邀請連結
    // 指向釣魚網域；未設定時（dev/preview）才退回代理 host，最後 request origin。
    const fwdHost = request.headers.get('x-forwarded-host')
    const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (fwdHost ? `${fwdProto}://${fwdHost}` : undefined) ||
      new URL(request.url).origin
    const inviteLink = `${baseUrl}/join?code=${invite.token}`

    return NextResponse.json({
      code: invite.token,
      inviteLink,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
