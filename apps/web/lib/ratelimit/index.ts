import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting helper backed by Upstash Redis.
 *
 * Behaviour is graceful by design:
 *   - If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are NOT configured
 *     (local dev / CI), the limiter is a no-op and always allows the request.
 *   - When configured, it applies a sliding-window limit keyed by `identifier`
 *     (typically the authenticated user id).
 */

type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  if (!redis) {
    redis = new Redis({ url, token })
  }

  return redis
}

// Cache limiter instances per (limit) so we don't rebuild them on every request.
const limiterCache = new Map<number, Ratelimit>()

function getLimiter(limit: number): Ratelimit | null {
  const client = getRedis()
  if (!client) {
    return null
  }

  let limiter = limiterCache.get(limit)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, '1 m'),
      analytics: false,
      prefix: 'familyplay:ratelimit',
    })
    limiterCache.set(limit, limiter)
  }

  return limiter
}

/**
 * Check whether `identifier` is within the allowed request budget.
 *
 * @param identifier Stable key for the caller (e.g. user.id).
 * @param limit Maximum requests allowed per minute (default 30).
 * @returns A result describing whether the request is allowed. When Upstash is
 *          not configured, always returns `success: true`.
 */
export async function checkRateLimit(identifier: string, limit = 30): Promise<RateLimitResult> {
  const limiter = getLimiter(limit)

  // Not configured → allow (don't break local/CI).
  if (!limiter) {
    return { success: true, limit, remaining: limit, reset: Date.now() }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // If Redis is unreachable, fail open rather than blocking real users.
    console.error('Rate limit check failed; allowing request', error)
    return { success: true, limit, remaining: limit, reset: Date.now() }
  }
}
