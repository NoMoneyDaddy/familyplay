import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// 編輯紀錄：只允許改結果/反應/時長（不可變更 child_id、household_id —— RLS 的 WITH CHECK 鎖死）。
// 至少要帶一個欄位，避免空更新。
const patchSchema = z
  .object({
    outcome: z.enum(['completed', 'tried', 'abandoned']).optional(),
    childReaction: z
      .enum(['happy', 'engaged', 'neutral', 'leaving', 'disinterested', 'calmed'])
      .optional(),
    durationSecs: z.number().int().positive().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少需要一個欄位' })

const paramsSchema = z.object({ id: z.string().uuid() })

/**
 * Creates a Supabase server client for authenticated server-side operations.
 *
 * @param cookieStore - The Next.js cookie store used for managing authentication cookies
 * @returns A Supabase server client configured with the provided cookie store, or `null` if required environment variables are not set
 */
function getClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // 變更類請求（PATCH/DELETE）可能觸發 session refresh；把更新後的 cookie 寫回，
      // 避免使用者在操作後因 token 過期被意外登出。
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // 某些 render 階段無法寫 cookie，忽略即可
        }
      },
    },
  })
}

/**
 * Partially updates a companion log entry.
 *
 * The user must be authenticated and own the log. The request body is validated
 * and only provided fields are updated.
 *
 * @returns `{ success: true }` on success; `{ error: string }` on failure with
 * appropriate status code (400 for invalid input, 401 if unauthenticated, 404 if
 * not found or not permitted, 500 for server errors).
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const supabase = getClient(cookieStore)
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = paramsSchema.parse(await ctx.params)
    const body = await request.json()
    const patch = patchSchema.parse(body)

    const update: Record<string, unknown> = {}
    if (patch.outcome !== undefined) update.outcome = patch.outcome
    if (patch.childReaction !== undefined) update.child_reaction = patch.childReaction
    if (patch.durationSecs !== undefined) update.duration_secs = patch.durationSecs

    // RLS（log_owner_update）保證只有建立者能改；.select() 回傳 0 列代表非擁有者或不存在
    const { data, error } = await supabase
      .from('companion_logs')
      .update(update)
      .eq('id', id)
      .select('id')

    if (error) {
      console.error('Failed to update companion log', error)
      return NextResponse.json({ error: 'Failed to update log' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found or not permitted' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    // 無效 JSON 屬於客戶端錯誤
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Deletes a companion log for the authenticated user.
 *
 * The user must own the companion log being deleted.
 *
 * @returns A NextResponse with status 200 and `{ success: true }` on successful deletion, 401 if unauthorized, 400 for invalid request parameters, 404 if the log is not found or not owned, or 500 on server error.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const supabase = getClient(cookieStore)
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = paramsSchema.parse(await ctx.params)

    // RLS（log_owner_delete）保證只有建立者能刪；.select() 回傳 0 列代表非擁有者或不存在
    const { data, error } = await supabase.from('companion_logs').delete().eq('id', id).select('id')

    if (error) {
      console.error('Failed to delete companion log', error)
      return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found or not permitted' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
