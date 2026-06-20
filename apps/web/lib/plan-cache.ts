// 方案快取：多個廣告/贊助位與頁面切換時共用同一次 entitlements 請求，避免重複網路請求。
// 暫時失敗不長存：清掉快取讓下次重試，否則一次網路抖動會把整個 session 鎖成 free。
let planPromise: Promise<string> | null = null

export function getPlanCached(): Promise<string> {
  if (!planPromise) {
    planPromise = fetch('/api/account/entitlements')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('entitlements failed'))))
      .then((d) => (d?.plan as string) ?? 'free')
      .catch(() => {
        planPromise = null
        return 'free'
      })
  }
  return planPromise
}

/** 是否為付費方案（supporter/plus 去廣告/贊助）。讀失敗時回 false（顯示輕量廣告）。 */
export function isPaidPlan(plan: string): boolean {
  return plan === 'supporter' || plan === 'plus'
}
