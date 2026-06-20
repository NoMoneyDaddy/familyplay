'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PlanComparison } from '@/app/components/plan-comparison'
import {
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

/**
 * Displays the authenticated user's subscription plan details and plan comparison options.
 */
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

      {/* 目前方案卡：付費方案做成「會員卡」頭——品牌徽章 + 方案名，給訂閱者一點被重視的儀式感 */}
      <Card
        className={`relative overflow-hidden ${isCurrentPlanHighlighted ? 'border-brand/30 bg-brand-tint' : ''}`}
      >
        {isCurrentPlanHighlighted && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand opacity-10 blur-2xl"
          />
        )}
        <div className="relative mb-4 flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
              isCurrentPlanHighlighted
                ? 'bg-[image:var(--gradient-brand)] shadow-brand'
                : 'bg-brand-tint'
            }`}
          >
            <Icon
              name={planInfo.icon}
              className={`h-6 w-6 ${isCurrentPlanHighlighted ? 'text-white' : 'text-brand'}`}
            />
          </span>
          <div>
            <p className="text-sm font-medium text-muted">目前方案</p>
            <h2 className="text-2xl font-bold leading-tight text-text">{planInfo.name}</h2>
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

                {/* AI 生成剩餘次數：抬成獨立焦點統計——大數字 + 進度條，一眼看懂還剩多少額度 */}
                <div className="space-y-2.5 rounded-lg bg-card p-4 shadow-clay-sm ring-1 ring-border/50">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-muted">AI 生成剩餘</span>
                    <span className="font-display text-2xl font-bold text-brand">
                      {entitlements.plusAiCallsRemaining}
                      <span className="ml-1 text-sm font-medium text-muted">/ 100</span>
                    </span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all"
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

      {/* 訂閱管理（付費方案）：RevenueCat。行動端由 App Store／Google Play 管理；
          網頁 Web Billing 的取消／付款更新由 RevenueCat 寄送的訂閱信內連結處理。 */}
      {entitlements.plan !== 'free' && (
        <Callout tone="info" title="管理訂閱">
          <p>
            行動端訂閱請至 App Store / Google Play 的「訂閱」管理；網頁訂閱可透過 RevenueCat
            寄送的訂閱確認信中的連結更新付款方式或取消。
          </p>
        </Callout>
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
