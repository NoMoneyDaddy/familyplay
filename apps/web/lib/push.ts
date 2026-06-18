'use client'

// 睡前提醒的前端 Web Push 工具：請求權限、訂閱/取消、同步到後端。
// 需設定 NEXT_PUBLIC_VAPID_PUBLIC_KEY（未設定時功能自動休眠）。

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY)
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// VAPID 公鑰（base64url）轉成 applicationServerKey 需要的 Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  // sw-register 已在 production 註冊；這裡等它就緒
  return navigator.serviceWorker.ready
}

export async function getReminderState(): Promise<'unsupported' | 'denied' | 'on' | 'off'> {
  if (!isPushSupported() || !isPushConfigured()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await readyRegistration()
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

// 開啟提醒：請求權限 → 訂閱 → 存到後端。回傳是否成功。
export async function enableReminders(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported() || !isPushConfigured() || !VAPID_PUBLIC_KEY) {
    return { ok: false, error: '此裝置或瀏覽器不支援提醒功能' }
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: '請在瀏覽器允許通知，才能收到睡前提醒' }
  }
  try {
    const reg = await readyRegistration()
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }
    const json = sub.toJSON()
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    })
    if (!res.ok) return { ok: false, error: '儲存訂閱失敗，請稍後再試' }
    return { ok: true }
  } catch {
    return { ok: false, error: '開啟提醒時發生錯誤，請稍後再試' }
  }
}

// 關閉提醒：取消訂閱 + 通知後端刪除。
export async function disableReminders(): Promise<{ ok: boolean }> {
  try {
    const reg = await readyRegistration()
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe().catch(() => {})
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {})
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
