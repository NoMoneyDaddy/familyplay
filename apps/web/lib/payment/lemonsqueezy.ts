import crypto from 'node:crypto'

/**
 * Verify LemonSqueezy webhook signature using HMAC-SHA256
 * @param body Raw request body as string
 * @param signature Signature from x-signature header
 * @param secret Webhook secret from env
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  // SHA-256 hex 簽章固定 64 字元（32 bytes）。先精確驗格式：非法或長度不符直接回
  // false（→路由 401），不浪費 HMAC 計算，也避免 timingSafeEqual 因長度不等 throw。
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) return false
  const hmacBuf = crypto.createHmac('sha256', secret).update(body).digest() // Buffer，免 hex 來回轉
  const sigBuf = Buffer.from(signature, 'hex')
  return crypto.timingSafeEqual(hmacBuf, sigBuf)
}

/**
 * Create checkout session with LemonSqueezy
 * @param variantId LemonSqueezy variant ID
 * @param email Customer email
 * @param userProfileId For webhook reconciliation
 * @param returnUrl URL to redirect after checkout
 * @returns Checkout URL
 */
export async function createLemonSqueezyCheckout(
  variantId: number,
  email: string,
  userProfileId: string,
  returnUrl?: string,
): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  // Store ID 僅在後端建立結帳時使用，不需 NEXT_PUBLIC_ 前綴（與 .env.example 一致）。
  const storeId = process.env.LEMONSQUEEZY_STORE_ID

  if (!apiKey || !storeId) {
    throw new Error('LemonSqueezy credentials not configured')
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email,
          custom: {
            userProfileId,
          },
        },
        preview: false,
        redirect_url: returnUrl,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: storeId,
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: variantId.toString(),
          },
        },
      },
    },
  }

  // 外部 API 無逾時會把整個請求掛住、佔住 serverless 連線。設 10 秒上限，逾時轉成清楚錯誤。
  let response: Response
  try {
    response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new Error('LemonSqueezy API timeout')
    }
    throw e
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`LemonSqueezy API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  const checkoutUrl = data.data?.attributes?.url

  if (!checkoutUrl) {
    throw new Error('No checkout URL in LemonSqueezy response')
  }

  return checkoutUrl
}

/**
 * Fetch the LemonSqueezy customer portal URL for an existing subscription.
 * The portal is where the customer can update payment method, cancel, or
 * resume — LemonSqueezy hosts it; we never handle card data ourselves.
 * @param subscriptionId LemonSqueezy subscription id (stored at purchase via webhook)
 * @returns Signed customer-portal URL (short-lived), or null if unavailable
 */
export async function getLemonSqueezyCustomerPortalUrl(
  subscriptionId: string,
): Promise<string | null> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) {
    throw new Error('LemonSqueezy credentials not configured')
  }

  // 外部 API 設 10 秒上限，逾時轉成清楚錯誤，不掛住 serverless 連線。
  let response: Response
  try {
    response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
      },
      signal: AbortSignal.timeout(10000),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new Error('LemonSqueezy API timeout')
    }
    throw e
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`LemonSqueezy API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  // 簽章的 portal URL 放在 attributes.urls.customer_portal；可能因方案狀態而缺漏。
  const portalUrl: unknown = data.data?.attributes?.urls?.customer_portal
  return typeof portalUrl === 'string' && portalUrl.length > 0 ? portalUrl : null
}
