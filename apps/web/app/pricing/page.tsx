'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LegalLinks } from '@/app/components/legal-links'
import { PlanComparison } from '@/app/components/plan-comparison'
import { Callout, Card, Icon, PageHeader, PageShell } from '@/app/components/ui'
import { useGoBack } from '@/lib/use-go-back'

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
  const goBack = useGoBack('/settings')
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
        onBack={goBack}
      />

      {loading ? (
        <div className="space-y-4" role="status" aria-label="載入方案中">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <>
          {/* 簽名區：暖色支持帶——先說清楚「為什麼付費」，把方案放進溫暖的脈絡裡 */}
          <Card className="relative overflow-hidden border-brand/30 bg-brand-tint">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand opacity-10 blur-2xl"
            />
            <div className="relative flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[image:var(--gradient-brand)] shadow-brand">
                <Icon name="heart" className="h-6 w-6 text-white" />
              </span>
              <div className="space-y-1">
                <p className="font-bold text-text">付費，是為了支持開發</p>
                <p className="text-sm leading-relaxed text-muted">
                  核心的陪伴方案永久免費。付費方案移除廣告、解鎖進階，也讓我們有餘力把這個 App
                  做得更好。
                </p>
              </div>
            </div>
          </Card>

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
            <button
              type="button"
              onClick={() => router.push('/account/entitlements')}
              className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-4 text-left shadow-clay-sm transition-all hover:bg-bg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Icon name="card" className="h-[20px] w-[20px] shrink-0 text-brand" />
              <span className="flex-1">
                <span className="block font-semibold text-text">管理我的訂閱</span>
                <span className="block text-sm text-muted">
                  目前：{PLAN_LABELS[currentPlan] ?? currentPlan}
                </span>
              </span>
              <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-faint" />
            </button>
          )}

          <LegalLinks className="pt-2" />
        </>
      )}
    </PageShell>
  )
}
