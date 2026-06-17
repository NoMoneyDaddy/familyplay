'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, Callout, Card, ErrorAlert, Icon, PageHeader, PageShell } from '@/app/components/ui'

type PaidPlan = 'supporter' | 'plus'

interface PricingPageState {
  loading: boolean
  authenticating: boolean
  currentPlan: string | null
  selectedPlan: PaidPlan | null
  error: string | null
}

interface PlanCard {
  id: 'free' | PaidPlan
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  highlight?: boolean
}

// 輕營利取向：大部分功能免費（以輕度廣告支撐）；付費可移除廣告並解鎖進階，價格溫和、隨時可取消。
// 顯示價格須與 LemonSqueezy variant 設定一致（見 README / env）。
const PLAN_CARDS: PlanCard[] = [
  {
    id: 'free',
    name: '免費',
    price: 'NT$0',
    period: '永久',
    tagline: '大部分功能免費，僅有少量不干擾的廣告',
    features: [
      '30 秒個人化陪伴方案',
      '完整親子活動庫',
      '發展階段與能力追蹤',
      '近 7 天活動歷史',
      '少量輕度廣告（可付費移除）',
    ],
  },
  {
    id: 'supporter',
    name: '支持者',
    price: 'NT$90',
    period: '/月',
    tagline: '移除廣告、解鎖便利，一起支持開發 ☕',
    features: [
      '移除廣告，乾淨體驗',
      '免費版的全部功能',
      '完整活動歷史（不限天數）',
      '家庭成員共享（配偶／長輩一起用）',
      '匯出陪伴紀錄',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 'NT$170',
    period: '/月',
    tagline: '進階陪伴，AI 為你客製',
    highlight: true,
    features: [
      '支持者的全部功能',
      'AI 客製化活動生成',
      '活動加密筆記',
      '每月 100 次 AI 生成',
      '交接摘要（給保母／長輩）',
      '優先支援',
    ],
  },
]

const PLAN_LABELS: Record<string, string> = {
  free: '免費',
  supporter: '支持者',
  plus: 'Plus',
}

export default function PricingPage() {
  const router = useRouter()
  const [state, setState] = useState<PricingPageState>({
    loading: true,
    authenticating: false,
    currentPlan: null,
    selectedPlan: null,
    error: null,
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profileResponse = await fetch('/api/profile')
        if (!profileResponse.ok) {
          setState((prev) => ({ ...prev, currentPlan: null, loading: false }))
          return
        }

        const entitlementsResponse = await fetch('/api/account/entitlements')
        if (entitlementsResponse.ok) {
          const entitlements = await entitlementsResponse.json()
          setState((prev) => ({ ...prev, currentPlan: entitlements.plan, loading: false }))
        } else {
          setState((prev) => ({ ...prev, currentPlan: 'free', loading: false }))
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setState((prev) => ({ ...prev, currentPlan: null, loading: false }))
      }
    }

    checkAuth()
  }, [])

  const handleSubscribe = async (planId: PaidPlan) => {
    setState((prev) => ({ ...prev, selectedPlan: planId, authenticating: true, error: null }))

    try {
      const profileResponse = await fetch('/api/profile')
      if (!profileResponse.ok) {
        router.push('/auth')
        return
      }

      const checkoutResponse = await fetch('/api/lemon/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          returnUrl: `${window.location.origin}/account/entitlements`,
        }),
      })

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json()
        setState((prev) => ({
          ...prev,
          selectedPlan: null,
          authenticating: false,
          error: error.error || '無法建立結帳，請稍後再試',
        }))
        return
      }

      const { checkoutUrl } = await checkoutResponse.json()
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Checkout error:', error)
      setState((prev) => ({
        ...prev,
        selectedPlan: null,
        authenticating: false,
        error: error instanceof Error ? error.message : '結帳失敗，請稍後再試',
      }))
    }
  }

  // action：'auth' 導去登入/註冊；'subscribe' 建立結帳；'manage' 導去訂閱管理（避免重複訂閱）；'none' 靜態
  const ctaFor = (
    plan: PlanCard,
  ): { label: string; action: 'auth' | 'subscribe' | 'manage' | 'none' } => {
    const cp = state.currentPlan
    if (plan.id === 'free') {
      if (cp === null) return { label: '免費開始使用', action: 'auth' }
      if (cp === 'free') return { label: '你目前的方案', action: 'none' }
      return { label: '已包含在你的方案', action: 'none' }
    }
    // 付費方案
    if (cp === plan.id) return { label: '你目前的方案', action: 'none' }
    // 已在另一個付費方案 → 不可直接結帳（會重複扣款），導去訂閱管理升降級
    if (cp && cp !== 'free') return { label: '至訂閱管理變更方案', action: 'manage' }
    // 未登入或免費 → 可訂閱（未登入時 handleSubscribe 會導去 /auth）
    return { label: plan.id === 'supporter' ? '成為支持者' : '升級 Plus', action: 'subscribe' }
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        title="方案與支持"
        subtitle="大部分功能免費（含少量廣告）；付費可移除廣告並解鎖進階"
      />

      <ErrorAlert message={state.error} />

      {state.loading ? (
        <div className="space-y-4" role="status" aria-label="載入方案中">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <>
          {state.currentPlan === null && (
            <Card className="p-4 text-center text-sm text-muted">
              免費版無需付費即可開始；登入後即可選擇付費方案支持我們。
            </Card>
          )}
          {state.currentPlan === 'free' && (
            <Callout tone="info" title="你正在使用免費版">
              免費版已包含完整核心功能。若這個 App 對你有幫助，歡迎用付費方案支持我們持續開發。
            </Callout>
          )}

          <ul className="space-y-4">
            {PLAN_CARDS.map((plan) => {
              const cta = ctaFor(plan)
              const isCurrent = state.currentPlan === plan.id
              return (
                <li
                  key={plan.id}
                  className={`relative rounded-lg border bg-card p-6 shadow-sm transition-all ${
                    plan.highlight ? 'border-brand' : 'border-border'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -right-3 -top-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                      目前方案
                    </div>
                  )}

                  <div className="mb-4 space-y-1">
                    <h2 className="text-xl font-bold text-text">{plan.name}</h2>
                    <p className="text-sm text-muted">{plan.tagline}</p>
                  </div>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-brand">{plan.price}</span>
                    <span className="text-muted">{plan.period}</span>
                  </div>

                  <ul className="mb-6 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-text">
                        <Icon
                          name="check"
                          className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {cta.action === 'subscribe' || cta.action === 'auth' ? (
                    <Button
                      onClick={() =>
                        cta.action === 'auth'
                          ? router.push('/auth')
                          : handleSubscribe(plan.id as PaidPlan)
                      }
                      disabled={state.authenticating}
                      loading={state.authenticating && plan.id === state.selectedPlan}
                    >
                      {state.authenticating && plan.id === state.selectedPlan
                        ? '處理中…'
                        : cta.label}
                    </Button>
                  ) : cta.action === 'manage' ? (
                    <Button
                      variant="secondary"
                      onClick={() => router.push('/account/entitlements')}
                    >
                      {cta.label}
                    </Button>
                  ) : (
                    <p className="rounded-md bg-bg py-3 text-center text-sm font-medium text-muted">
                      {cta.label}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="space-y-4 rounded-lg bg-bg p-6">
            <h2 className="font-semibold text-text">常見問題</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-text">免費版會不會有功能限制？</p>
                <p className="mt-1 text-muted">
                  核心的「30 秒陪伴方案」與活動庫永久免費、不限次數。付費方案只是額外的便利與支持。
                </p>
              </div>
              <div>
                <p className="font-medium text-text">可以隨時取消嗎？</p>
                <p className="mt-1 text-muted">
                  可以。隨時在帳號設定取消，當期到期後即回到免費版，不綁約。
                </p>
              </div>
              <div>
                <p className="font-medium text-text">付費方案之間可以調整嗎？</p>
                <p className="mt-1 text-muted">可以隨時在支持者與 Plus 之間升降級。</p>
              </div>
            </div>
          </div>

          {state.currentPlan && state.currentPlan !== 'free' && (
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={() => router.push('/account/entitlements')}
                className="font-medium text-brand hover:underline"
              >
                管理我的訂閱（目前：{PLAN_LABELS[state.currentPlan] ?? state.currentPlan}）
              </button>
            </p>
          )}
        </>
      )}
    </PageShell>
  )
}
