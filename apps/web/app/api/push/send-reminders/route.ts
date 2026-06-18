import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

// 睡前陪伴提醒派送（由排程在固定時間呼叫，例如每晚 19:30 Asia/Taipei）。
// 安全：需帶 CRON_SECRET。休眠：未設定 VAPID 金鑰時不送、回 200 noop。
// 對象：有訂閱、且「今天」尚未記錄任何陪伴的家長。不傳孩子可識別資料。
export const runtime = 'nodejs'

const PAGE_SIZE = 1000 // 每次從 DB 取的訂閱筆數
const CONCURRENCY = 100 // 同時併發的 push 連線數上限
const SEND_TIMEOUT_MS = 10000 // 單筆 push 逾時

interface PushSub {
  id: string
  user_profile_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// 今天（Asia/Taipei，UTC+8、無日光節約）開始時刻的 ISO
function startOfTodayTaipeiIso(): string {
  const nowMs = Date.now()
  const tw = new Date(nowMs + 8 * 3600 * 1000)
  const startUtcMs =
    Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate()) - 8 * 3600 * 1000
  return new Date(startUtcMs).toISOString()
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || !authorized(request, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  // 休眠：尚未設定 VAPID 金鑰
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ ok: true, dormant: true, sent: 0 })
  }

  // VAPID subject 為 push 服務識別用（非使用者可見）；用站點 URL，避免依賴聯絡信箱
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'https://familyplay.zeabur.app',
    vapidPublic,
    vapidPrivate,
  )

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 今天已記錄陪伴的家長 → 不打擾
  const sinceIso = startOfTodayTaipeiIso()
  const { data: loggedToday } = await admin
    .from('companion_logs')
    .select('caregiver_id')
    .gte('created_at', sinceIso)
  const loggedSet = new Set((loggedToday || []).map((r) => r.caregiver_id))

  const payload = JSON.stringify({
    title: '陪伴一下孩子吧 🌙',
    body: '今天還沒有陪伴紀錄。30 秒拿到今晚適合的方案。',
    url: '/select',
    tag: 'familyplay-bedtime',
  })

  let sent = 0
  const staleIds: string[] = []

  async function sendOne(s: PushSub): Promise<void> {
    try {
      // 每筆設逾時：單一 push 端點卡住不該拖垮整批（webpush 內部 timeout 單位為秒）。
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { timeout: SEND_TIMEOUT_MS / 1000 },
      )
      sent += 1
    } catch (err: unknown) {
      // 訂閱失效（404/410）→ 標記清除
      const statusCode =
        typeof err === 'object' && err !== null && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      if (statusCode === 404 || statusCode === 410) staleIds.push(s.id)
    }
  }

  // 分頁載入 + 有界併發：避免把全部訂閱一次拉進記憶體、也避免 Promise.all 同時開上萬條連線。
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: subs, error: subErr } = await admin
      .from('push_subscriptions')
      .select('id,user_profile_id,endpoint,p256dh,auth')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (subErr) {
      console.error('send-reminders: failed to load subscriptions', subErr)
      // 已送出的不回滾；回 207 表示部分完成，讓排程記得有錯但不必整批重試。
      return NextResponse.json(
        {
          ok: false,
          sent,
          cleaned: staleIds.length,
          error: 'Partial: failed to page subscriptions',
        },
        { status: 207 },
      )
    }
    if (!subs || subs.length === 0) break

    const targets = (subs as PushSub[]).filter((s) => !loggedSet.has(s.user_profile_id))
    // 以 CONCURRENCY 為一塊，塊內並行、塊間序列，控制同時連線數。
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      await Promise.all(targets.slice(i, i + CONCURRENCY).map(sendOne))
    }

    if (subs.length < PAGE_SIZE) break // 最後一頁
  }

  if (staleIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', staleIds)
  }

  return NextResponse.json({ ok: true, sent, cleaned: staleIds.length })
}
