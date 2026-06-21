import { getAgeMonths, getStageKey } from '@familyplay/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'

const updateSchema = z
  .object({
    nickname: z.string().min(1).optional(),
    birthYearMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    // 生日精確到日（選填）。空字串視為「清除」精確日，回到只到月。
    birthDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).optional(),
  })
  .refine(
    (d) => !d.birthDate || !d.birthYearMonth || d.birthDate.startsWith(`${d.birthYearMonth}-`),
    {
      message: 'birthDate 與 birthYearMonth 不一致',
      path: ['birthDate'],
    },
  )

async function validateChildOwnership(
  supabase: SupabaseClient,
  childId: string,
  userProfileId: string,
): Promise<boolean> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userProfileId)
    .single()

  if (!userProfile) return false

  // Owners AND caregivers can manage children (matches the RLS policy).
  const { data: memberships } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_profile_id', userProfileId)
    .in('role', ['owner', 'caregiver'])

  if (!memberships || memberships.length === 0) return false

  const householdIds = (memberships as { household_id: string }[]).map((m) => m.household_id)

  const { data: child } = await supabase
    .from('child_profiles')
    .select('id')
    .eq('id', childId)
    .in('household_id', householdIds)
    .single()

  return !!child
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify ownership
    const isOwner = await validateChildOwnership(supabase, id, userProfile.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    const body = await request.json()
    const { nickname, birthYearMonth, birthDate } = updateSchema.parse(body)

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic field updates
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (nickname) {
      updateData.nickname = nickname
    }

    if (birthYearMonth) {
      const ageMonths = getAgeMonths(birthYearMonth)
      const stageKey = getStageKey(ageMonths)
      updateData.birth_year_month = birthYearMonth
      updateData.stage_key = stageKey
    }

    // 生日精確到日：有值寫入、空字串清除（回到只到月）
    if (birthDate !== undefined) {
      updateData.birth_date = birthDate === '' ? null : birthDate
    }

    const { data: updated, error } = await supabase
      .from('child_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      reportError(error, { route: 'PUT /api/children/[id]', userId: user.id, childId: id })
      return NextResponse.json({ error: 'Failed to update child profile' }, { status: 500 })
    }

    return NextResponse.json({
      id: updated.id,
      nickname: updated.nickname,
      birthYearMonth: updated.birth_year_month,
      birthDate: updated.birth_date ?? null,
      stageKey: updated.stage_key,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    // 無效 JSON 屬客戶端錯誤（400），不上報 Sentry 以免噪音（與 /api/logs/[id] 一致）
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    reportError(error, { route: 'PUT /api/children/[id]', userId: user.id, childId: id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify ownership
    const isOwner = await validateChildOwnership(supabase, id, userProfile.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Soft delete by marking as inactive (if schema supports it)
    // For now, do a hard delete since the schema doesn't have an isActive field for children
    const { error } = await supabase.from('child_profiles').delete().eq('id', id)

    if (error) {
      reportError(error, { route: 'DELETE /api/children/[id]', userId: user.id, childId: id })
      return NextResponse.json({ error: 'Failed to delete child profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    reportError(error, { route: 'DELETE /api/children/[id]', userId: user.id, childId: id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
