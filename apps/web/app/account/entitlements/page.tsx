'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PlanComparison } from '@/app/components/plan-comparison'
import {
  Button,
  Callout,
  Card,
  ErrorAlert,
  Icon,
  type IconName,
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
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPlanDisplay = (plan: string): { name: string; icon: IconName } => {
    switch (plan) {
      case 'free':
        return { name: '免費', icon: 'user' }
      case 'supporter':
        return { name: '支持者', icon: 'sparkle' }
      case 'plus':
        return { name: 'Plus', icon: 'star' }
      default:
        return { name: '未知', icon: 'lock' }
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="h-96 animate-pulse rounded-xl bg-surface" />
      </PageShell>
    )
  }

  if (!entitlements) {
    return (
      <PageShell>
        <PageHeader title="帳號" align="center" />
        <ErrorAlert message="無法載入方案資訊，請稍後再試。" />
      </PageShell>
    )
  }

  const planInfo = getPlanDisplay(entitlements.plan)
  const isCurrentPlanHighlighted = entitlements.plan !== 'free'

  return (
    <PageShell>
      <PageHeader title="訂閱方案" subtitle="管理你的 FamilyPlay 方案" align="center" />

      {/* 目前方案卡 */}
      <Card className={isCurrentPlanHighlighted ? 'border-brand bg-brand-tint' : ''}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">目前方案</p>
            <div className="mt-2 flex items-center gap-2">
              <Icon name={planInfo.icon} className="h-[26px] w-[26px] text-brand" />
              <h2 className="text-2xl font-bold text-text">{planInfo.name}</h2>
            </div>
          </div>
        </div>

        {/* 方案明細 */}
        {(entitlements.plan === 'supporter' || entitlements.plan === 'plus') && (
          <div className="space-y-3 border-t border-border pt-4">
            {entitlements.plan === 'supporter' && entitlements.supporterPurchasedAt && (
              <div className="flex justify-between">
                <span className="text-sm text-muted">購買於</span>
                <span className="text-sm font-medium text-text">
                  {formatDate(entitlements.supporterPurchasedAt)}
                </span>
              </div>
            )}

            {entitlements.plan === 'plus' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">開始於</span>
                  <span className="text-sm font-medium text-text">
                    {formatDate(entitlements.plusStartedAt)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted">續訂日期</span>
                  <span className="text-sm font-medium text-text">
                    {formatDate(entitlements.plusEndsAt)}
                  </span>
                </div>

                {/* AI 生成剩餘次數 */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">AI 生成剩餘</span>
                    <span className="text-sm font-bold text-brand">
                      {entitlements.plusAiCallsRemaining}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-[image:var(--gradient-brand)] transition-all"
                      style={{
                        width: `${Math.min(100, (entitlements.plusAiCallsRemaining / 100) * 100)}%`,
                      }}
                    />
                  </div>
                  {entitlements.plusAiCallsResetAt && (
                    <p className="text-xs text-muted">
                      {formatDate(entitlements.plusAiCallsResetAt)} 重置
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 訂閱管理（付費方案）：直接在本頁操作，不必再跳到別頁 */}
      {entitlements.plan !== 'free' && (
        <Button variant="secondary" size="lg" disabled>
          透過 LemonSqueezy 管理訂閱
        </Button>
      )}

      {/* 說明 */}
      <Callout tone="tip" title="關於你的方案">
        {entitlements.plan === 'free' && (
          <p>你目前使用免費版。升級為「支持者」或「Plus」可解鎖更多功能、移除廣告。</p>
        )}
        {entitlements.plan === 'supporter' && (
          <p>謝謝你支持 FamilyPlay！隨時可升級 Plus 解鎖 AI 客製活動生成。</p>
        )}
        {entitlements.plan === 'plus' && (
          <p>你已擁有完整 Plus 功能。訂閱將於 {formatDate(entitlements.plusEndsAt)} 自動續訂。</p>
        )}
      </Callout>

      {/* 方案比較與升級：直接內嵌（原 /pricing 內容），不必再跳到另一頁 */}
      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-text">所有方案</h2>
          <p className="text-sm text-muted">大部分功能免費；付費可移除廣告並解鎖進階。</p>
        </div>
        <PlanComparison currentPlan={entitlements.plan} />
      </section>

      <button
        type="button"
        onClick={() => router.back()}
        className="text-center text-sm font-medium text-brand transition-opacity hover:opacity-70"
      >
        返回
      </button>
    </PageShell>
  )
}
