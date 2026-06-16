'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Entitlements {
  plan: 'free' | 'supporter' | 'plus'
  supporterPurchasedAt: string | null
  plusStartedAt: string | null
  plusEndsAt: string | null
  plusAiCallsRemaining: number
  plusAiCallsResetAt: string | null
}

interface UserProfile {
  displayName?: string
  avatarUrl?: string
}

export default function EntitlementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, entitlementsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/account/entitlements'),
        ])

        if (!profileRes.ok) {
          router.push('/auth')
          return
        }

        const profileData = await profileRes.json()
        setUser(profileData)

        if (entitlementsRes.ok) {
          const entitlementsData = await entitlementsRes.json()
          setEntitlements(entitlementsData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPlanDisplay = (plan: string) => {
    switch (plan) {
      case 'free':
        return { name: 'Free', icon: '🆓', color: 'gray' }
      case 'supporter':
        return { name: 'Supporter', icon: '⭐', color: 'blue' }
      case 'plus':
        return { name: 'Plus', icon: '✨', color: 'purple' }
      default:
        return { name: 'Unknown', icon: '❓', color: 'gray' }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
        <div className="mx-auto max-w-[480px]">
          <div className="h-96 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </main>
    )
  }

  if (!entitlements) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
        <div className="mx-auto max-w-[480px] space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-[--color-brand]">Account</h1>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-900">Failed to load entitlements. Please try again.</p>
          </div>
        </div>
      </main>
    )
  }

  const planInfo = getPlanDisplay(entitlements.plan)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">Subscription</h1>
          <p className="text-[--color-muted]">Manage your FamilyPlay plan</p>
        </div>

        {/* Current Plan Card */}
        <div
          className={`rounded-2xl border-2 p-6 ${
            planInfo.color === 'purple'
              ? 'border-purple-200 bg-purple-50'
              : planInfo.color === 'blue'
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[--color-muted]">Current Plan</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl">{planInfo.icon}</span>
                <h2 className="text-2xl font-bold text-[--color-text]">{planInfo.name}</h2>
              </div>
            </div>
          </div>

          {/* Plan details */}
          <div className="space-y-3 border-t pt-4">
            {entitlements.plan === 'supporter' && entitlements.supporterPurchasedAt && (
              <div className="flex justify-between">
                <span className="text-sm text-[--color-muted]">Purchased</span>
                <span className="text-sm font-medium text-[--color-text]">
                  {formatDate(entitlements.supporterPurchasedAt)}
                </span>
              </div>
            )}

            {entitlements.plan === 'plus' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-[--color-muted]">Started</span>
                  <span className="text-sm font-medium text-[--color-text]">
                    {formatDate(entitlements.plusStartedAt)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-[--color-muted]">Renewal Date</span>
                  <span className="text-sm font-medium text-[--color-text]">
                    {formatDate(entitlements.plusEndsAt)}
                  </span>
                </div>

                {/* AI calls remaining */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[--color-muted]">AI Calls Remaining</span>
                    <span className="text-sm font-bold text-[--color-brand]">
                      {entitlements.plusAiCallsRemaining}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300">
                    <div
                      className="h-full bg-[--color-brand] transition-all"
                      style={{
                        width: `${Math.min(100, (entitlements.plusAiCallsRemaining / 100) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[--color-muted]">
                    Resets {formatDate(entitlements.plusAiCallsResetAt)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {entitlements.plan === 'free' && (
            <button
              onClick={() => router.push('/pricing')}
              className="w-full rounded-lg bg-[--color-brand] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Explore Plans
            </button>
          )}

          {entitlements.plan === 'supporter' && (
            <button
              onClick={() => router.push('/pricing')}
              className="w-full rounded-lg bg-[--color-brand] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Upgrade to Plus
            </button>
          )}

          {entitlements.plan !== 'free' && (
            <button
              disabled
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold text-[--color-muted]"
            >
              Manage Subscription via LemonSqueezy
            </button>
          )}

          <a
            href="/pricing"
            className="block rounded-lg border-2 border-gray-200 px-4 py-3 text-center font-semibold text-[--color-text] transition-colors hover:bg-gray-50"
          >
            View All Plans
          </a>
        </div>

        {/* Information section */}
        <div className="space-y-4 rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">ℹ️ About Your Plan</h3>
          <div className="space-y-2 text-sm text-blue-800">
            {entitlements.plan === 'free' && (
              <>
                <p>You're using the free version of FamilyPlay.</p>
                <p>Upgrade to Supporter or Plus to unlock more features.</p>
              </>
            )}
            {entitlements.plan === 'supporter' && (
              <>
                <p>Thank you for supporting FamilyPlay development!</p>
                <p>You can upgrade to Plus anytime to unlock AI-powered activity generation.</p>
              </>
            )}
            {entitlements.plan === 'plus' && (
              <>
                <p>You have full access to all Plus features.</p>
                <p>Your subscription auto-renews on {formatDate(entitlements.plusEndsAt)}.</p>
              </>
            )}
          </div>
        </div>

        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="text-center text-sm text-[--color-brand] transition-opacity hover:opacity-70"
        >
          ← Back
        </button>
      </div>
    </main>
  )
}
