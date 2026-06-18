'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LegalLinks } from '@/app/components/legal-links'
import { PlanComparison } from '@/app/components/plan-comparison'
import { Callout, Card, PageHeader, PageShell } from '@/app/components/ui'

const PLAN_LABELS: Record<string, string> = {
  free: '免費',
  supporter: '支持者',
  plus: 'Plus',
}

/**
 * Renders the pricing and subscription plans page.
 *
 * Determines the user's current plan on mount and displays content accordingly, including plan comparisons and subscription management options for active subscribers. Shows loading placeholders while fetching plan information.
 */
export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profileResponse = await fetch('/api/profile')
        if (!profileResponse.ok) {
          setCurrentPlan(null)
          setLoading(false)
          return
        }

        const entitlementsResponse = await fetch('/api/account/entitlements')
        if (entitlementsResponse.ok) {
          const entitlements = await entitlementsResponse.json()
          setCurrentPlan(entitlements.plan)
        } else {
          setCurrentPlan('free')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setCurrentPlan(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  return (
    <PageShell className="space-y-8">
      <PageHeader
        title="方案與支持"
        subtitle="大部分功能免費（含少量廣告）；付費可移除廣告並解鎖進階"
      />

      {loading ? (
        <div className="space-y-4" role="status" aria-label="載入方案中">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <>
          {currentPlan === null && (
            <Card className="p-4 text-center text-sm text-muted">
              免費版無需付費即可開始；登入後即可選擇付費方案支持我們。
            </Card>
          )}
          {currentPlan === 'free' && (
            <Callout tone="info" title="你正在使用免費版">
              免費版已包含完整核心功能。若這個 App 對你有幫助，歡迎用付費方案支持我們持續開發。
            </Callout>
          )}

          <Callout tone="tip" title="開發中功能不收費">
            標示「即將推出」的功能仍在開發，<strong>尚未開放</strong>
            。我們不會為還沒交付的功能收費—— Plus 方案會等核心功能上線後才開放訂閱。
          </Callout>

          <PlanComparison currentPlan={currentPlan} />

          {currentPlan && currentPlan !== 'free' && (
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={() => router.push('/account/entitlements')}
                className="font-medium text-brand hover:underline"
              >
                管理我的訂閱（目前：{PLAN_LABELS[currentPlan] ?? currentPlan}）
              </button>
            </p>
          )}

          <LegalLinks className="pt-2" />
        </>
      )}
    </PageShell>
  )
}
