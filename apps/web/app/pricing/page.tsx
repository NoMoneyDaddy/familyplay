'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

// 輕營利取向：核心功能永久免費；付費為選擇性的「支持開發」，價格溫和、隨時可取消。
// 顯示價格須與 LemonSqueezy variant 設定一致（見 README / env）。
const PLAN_CARDS: PlanCard[] = [
  {
    id: 'free',
    name: '免費',
    price: 'NT$0',
    period: '永久',
    tagline: '核心陪伴功能，永久免費',
    features: ['30 秒個人化陪伴方案', '完整親子活動庫', '發展階段與能力追蹤', '近 7 天活動歷史'],
  },
  {
    id: 'supporter',
    name: '支持者',
    price: 'NT$90',
    period: '/月',
    tagline: '喜歡這個 App？請我們喝杯咖啡，一起支持開發 ☕',
    features: [
      '免費版的全部功能',
      '完整活動歷史（不限天數）',
      '家庭成員共享（配偶／長輩一起用）',
      '匯出陪伴紀錄',
      '無廣告',
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

  const ctaFor = (plan: PlanCard) => {
    if (plan.id === 'free') {
      return {
        label: state.currentPlan === 'free' ? '你目前的方案' : '免費開始使用',
        disabled: true,
      }
    }
    if (state.currentPlan === plan.id) {
      return { label: '你目前的方案', disabled: true }
    }
    return { label: plan.id === 'supporter' ? '成為支持者' : '升級 Plus', disabled: false }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">方案與支持</h1>
          <p className="text-[--color-muted]">核心功能永久免費，付費是選擇性的支持 💛</p>
        </div>

        {/* 錯誤 live region 常駐 DOM */}
        <div
          role="alert"
          className={state.error ? 'rounded-lg bg-red-50 p-4 text-sm text-red-700' : 'sr-only'}
        >
          {state.error}
        </div>

        {state.loading ? (
          <div className="space-y-4" role="status" aria-label="載入方案中">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : state.currentPlan === null ? (
          <div className="space-y-4 rounded-xl bg-[--color-bg] p-6 text-center">
            <p className="text-sm text-[--color-text]">
              登入後即可選擇方案。免費版無需付費即可使用。
            </p>
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="rounded-lg bg-[--color-brand] px-6 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              登入
            </button>
          </div>
        ) : (
          <>
            {state.currentPlan === 'free' && (
              <div className="rounded-lg bg-amber-50 p-4 text-sm">
                <p className="font-semibold text-amber-900">
                  <span aria-hidden="true">💡 </span>你正在使用免費版
                </p>
                <p className="mt-1 text-amber-800">
                  免費版已包含完整核心功能。若這個 App 對你有幫助，歡迎用付費方案支持我們持續開發。
                </p>
              </div>
            )}

            <ul className="space-y-4">
              {PLAN_CARDS.map((plan) => {
                const cta = ctaFor(plan)
                const isCurrent = state.currentPlan === plan.id
                return (
                  <li
                    key={plan.id}
                    className={`relative rounded-2xl border-2 p-6 transition-all ${
                      plan.highlight
                        ? 'border-[--color-brand] bg-white'
                        : 'border-[--color-border] bg-white'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -right-3 -top-3 rounded-full bg-[--color-brand] px-3 py-1 text-xs font-semibold text-white">
                        目前方案
                      </div>
                    )}

                    <div className="mb-4 space-y-1">
                      <h2 className="text-xl font-bold text-[--color-text]">{plan.name}</h2>
                      <p className="text-sm text-[--color-muted]">{plan.tagline}</p>
                    </div>

                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[--color-brand]">{plan.price}</span>
                      <span className="text-[--color-muted]">{plan.period}</span>
                    </div>

                    <ul className="mb-6 space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm text-[--color-text]"
                        >
                          <span
                            className="mt-0.5 flex-shrink-0 text-[--color-brand]"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.id === 'free' ? (
                      <p className="rounded-lg bg-[--color-bg] py-3 text-center text-sm font-medium text-[--color-muted]">
                        {cta.label}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSubscribe(plan.id as PaidPlan)}
                        disabled={cta.disabled || state.authenticating}
                        className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
                          cta.disabled
                            ? 'cursor-default bg-[--color-bg] text-[--color-muted]'
                            : 'bg-[--color-brand] text-white hover:opacity-90 disabled:opacity-50'
                        }`}
                      >
                        {state.authenticating && plan.id === state.selectedPlan ? (
                          <span className="flex items-center justify-center gap-2">
                            <span
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                              aria-hidden="true"
                            />
                            處理中…
                          </span>
                        ) : (
                          cta.label
                        )}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="space-y-4 rounded-xl bg-[--color-bg] p-6">
              <h2 className="font-semibold text-[--color-text]">常見問題</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-[--color-text]">免費版會不會有功能限制？</p>
                  <p className="mt-1 text-[--color-muted]">
                    核心的「30
                    秒陪伴方案」與活動庫永久免費、不限次數。付費方案只是額外的便利與支持。
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[--color-text]">可以隨時取消嗎？</p>
                  <p className="mt-1 text-[--color-muted]">
                    可以。隨時在帳號設定取消，當期到期後即回到免費版，不綁約。
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[--color-text]">付費方案之間可以調整嗎？</p>
                  <p className="mt-1 text-[--color-muted]">可以隨時在支持者與 Plus 之間升降級。</p>
                </div>
              </div>
            </div>

            {state.currentPlan && state.currentPlan !== 'free' && (
              <p className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => router.push('/account/entitlements')}
                  className="font-medium text-[--color-brand] hover:underline"
                >
                  管理我的訂閱（目前：{PLAN_LABELS[state.currentPlan] ?? state.currentPlan}）
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
