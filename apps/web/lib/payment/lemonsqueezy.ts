import crypto from 'node:crypto'

/**
 * Verify LemonSqueezy webhook signature using HMAC-SHA256
 * @param body Raw request body as string
 * @param signature Signature from x-signature header
 * @param secret Webhook secret from env
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return hmac === signature
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
  const storeId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID

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

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify(payload),
  })

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
