'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  ErrorAlert,
  Icon,
  type IconName,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'

interface Entitlements {
  plan: 'free' | 'supporter' | 'plus'
  supporterPurchasedAt: string | null
  plusStartedAt: string | null
  plusEndsAt: string | null
  plusAiCallsRemaining: number
  plusAiCallsResetAt: string | null
}

export default function EntitlementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
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

  const getPlanDisplay = (plan: string): { name: string; icon: IconName } => {
    switch (plan) {
      case 'free':
        return { name: 'Free', icon: 'user' }
      case 'supporter':
        return { name: 'Supporter', icon: 'sparkle' }
      case 'plus':
        return { name: 'Plus', icon: 'star' }
      default:
        return { name: 'Unknown', icon: 'lock' }
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="h-96 animate-pulse rounded-lg bg-surface" />
      </PageShell>
    )
  }

  if (!entitlements) {
    return (
      <PageShell>
        <PageHeader title="Account" align="center" />
        <ErrorAlert message="Failed to load entitlements. Please try again." />
      </PageShell>
    )
  }

  const planInfo = getPlanDisplay(entitlements.plan)
  const isCurrentPlanHighlighted = entitlements.plan !== 'free'

  return (
    <PageShell>
      <PageHeader title="Subscription" subtitle="Manage your FamilyPlay plan" align="center" />

      {/* Current Plan Card */}
      <Card
        className={
          isCurrentPlanHighlighted ? 'border-brand bg-brand-tint' : 'border-border bg-card'
        }
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Current Plan</p>
            <div className="mt-2 flex items-center gap-2">
              <Icon name={planInfo.icon} className="h-[28px] w-[28px] text-brand" />
              <h2 className="text-2xl font-bold text-text">{planInfo.name}</h2>
            </div>
          </div>
        </div>

        {/* Plan details */}
        <div className="space-y-3 border-t border-border pt-4">
          {entitlements.plan === 'supporter' && entitlements.supporterPurchasedAt && (
            <div className="flex justify-between">
              <span className="text-sm text-muted">Purchased</span>
              <span className="text-sm font-medium text-text">
                {formatDate(entitlements.supporterPurchasedAt)}
              </span>
            </div>
          )}

          {entitlements.plan === 'plus' && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Started</span>
                <span className="text-sm font-medium text-text">
                  {formatDate(entitlements.plusStartedAt)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted">Renewal Date</span>
                <span className="text-sm font-medium text-text">
                  {formatDate(entitlements.plusEndsAt)}
                </span>
              </div>

              {/* AI calls remaining */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">AI Calls Remaining</span>
                  <span className="text-sm font-bold text-brand">
                    {entitlements.plusAiCallsRemaining}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-brand transition-all"
                    style={{
                      width: `${Math.min(100, (entitlements.plusAiCallsRemaining / 100) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted">
                  Resets {formatDate(entitlements.plusAiCallsResetAt)}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Action buttons */}
      <div className="space-y-3">
        {entitlements.plan === 'free' && (
          <Button size="lg" onClick={() => router.push('/pricing')}>
            Explore Plans
          </Button>
        )}

        {entitlements.plan === 'supporter' && (
          <Button size="lg" onClick={() => router.push('/pricing')}>
            Upgrade to Plus
          </Button>
        )}

        {entitlements.plan !== 'free' && (
          <Button variant="secondary" size="lg" disabled>
            Manage Subscription via LemonSqueezy
          </Button>
        )}

        <LinkButton href="/pricing" variant="secondary" size="lg">
          View All Plans
        </LinkButton>
      </div>

      {/* Information section */}
      <Callout tone="info" title="About Your Plan">
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
      </Callout>

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.back()}
        className="text-center text-sm text-brand transition-opacity hover:opacity-70"
      >
        Back
      </button>
    </PageShell>
  )
}
