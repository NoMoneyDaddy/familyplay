'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, ErrorAlert, Icon } from '@/app/components/ui'
import { purchasePlan, WebPurchaseError } from '@/lib/payment/revenuecat-web'
import { checkoutReadyFor } from '@/lib/plan-checkout'

type PaidPlan = 'supporter' | 'plus'

interface PlanFeature {
  label: string
  soon?: boolean // 尚未實作、開發中——明確標示「即將推出」，不誇大已交付的功能
}

interface PlanCard {
  id: 'free' | PaidPlan
  name: string
  price: string
  period: string
  tagline: string
  features: PlanFeature[]
  highlight?: boolean
}

// 輕營利取向：大部分功能免費（以輕度廣告支撐）；付費可移除廣告並解鎖進階，價格溫和、隨時可取消。
// 誠實原則：尚未實作的功能一律標「即將推出」，核心未交付的方案不開放結帳。
// 顯示價格須與 RevenueCat 商品設定一致（見 README / env）。
const PLAN_CARDS: PlanCard[] = [
  {
    id: 'free',
    name: '免費',
    price: 'NT$0',
    period: '永久',
    tagline: '大部分功能免費，僅有少量不干擾的廣告',
    features: [
      { label: '30 秒個人化陪伴方案' },
      { label: '完整親子活動庫' },
      { label: '發展階段與能力追蹤' },
      { label: '近 7 天活動歷史' },
      { label: '少量輕度廣告（可付費移除）' },
    ],
  },
  {
    id: 'supporter',
    name: '支持者',
    price: 'NT$90',
    period: '/月',
    tagline: '移除廣告、解鎖便利，一起支持開發 ☕',
    features: [
      { label: '移除廣告，乾淨體驗' },
      { label: '免費版的全部功能' },
      { label: '家庭成員共享（配偶／長輩一起用）' },
      { label: '完整活動歷史（不限天數）', soon: true },
      { label: '匯出陪伴紀錄', soon: true },
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
      { label: '支持者的全部功能' },
      { label: 'AI 客製化活動生成' },
      { label: '每月 100 次託管 AI 生成' },
      { label: '交接摘要 AI 潤色（給保母／長輩）' },
      { label: '活動加密筆記', soon: true },
      { label: '優先支援', soon: true },
    ],
  },
]

/**
 * Renders a plan comparison and subscription management interface.
 *
 * Displays all available plans with features and determines the appropriate call-to-action (authentication, subscription, plan management, or disabled) based on the user's current plan. Handles the checkout flow for plan upgrades.
 *
 * @param currentPlan - The user's current plan ('free', 'supporter', or 'plus'), or `null` if not authenticated
 */
export function PlanComparison({ currentPlan }: { currentPlan: string | null }) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planId: PaidPlan) => {
    setSelectedPlan(planId)
    setAuthenticating(true)
    setError(null)

    try {
      const profileResponse = await fetch('/api/profile')
      if (!profileResponse.ok) {
        router.push('/auth')
        return
      }

      // 防護：結帳未就緒（RevenueCat 未設好 / Plus 開關未開）一律擋下，與卡片 CTA 一致。
      if (!checkoutReadyFor(planId)) {
        setError('線上結帳尚未開放，請稍後再試')
        return
      }

      const profile = await profileResponse.json()
      if (!profile.userProfileId) {
        router.push('/auth')
        return
      }
      const ok = await purchasePlan(profile.userProfileId, planId)
      // 成功：entitlements 由 RevenueCat webhook 回寫，導去訂閱頁等同步；取消則留在原頁。
      if (ok) router.push('/account/entitlements')
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof WebPurchaseError ? err.message : '結帳失敗，請稍後再試')
    } finally {
      // 統一在 finally 復位，避免早退分支殘留 loading 狀態。
      setSelectedPlan(null)
      setAuthenticating(false)
    }
  }

  // action：'auth' 導去登入/註冊；'subscribe' 建立結帳；'manage' 導去訂閱管理（避免重複訂閱）；'none' 靜態
  const ctaFor = (
    plan: PlanCard,
  ): { label: string; action: 'auth' | 'subscribe' | 'manage' | 'none' | 'soon' } => {
    const cp = currentPlan
    if (plan.id === 'free') {
      if (cp === null) return { label: '免費開始使用', action: 'auth' }
      if (cp === 'free') return { label: '你目前的方案', action: 'none' }
      return { label: '已包含在你的方案', action: 'none' }
    }
    // 結帳未就緒（RevenueCat 未設好 / Plus 開關未開）→ 顯示「即將推出」，不開會跳錯的購買鈕
    if (!checkoutReadyFor(plan.id) && cp !== plan.id) return { label: '即將推出', action: 'soon' }
    // 付費方案
    if (cp === plan.id) return { label: '你目前的方案', action: 'none' }
    // 已在另一個付費方案 → 不可直接結帳（會重複扣款），導去訂閱管理升降級
    if (cp && cp !== 'free') return { label: '至訂閱管理變更方案', action: 'manage' }
    const label = plan.id === 'supporter' ? '成為支持者' : '升級 Plus'
    // 未登入 → 直接導去登入，省一次多餘的 /api/profile 往返
    if (cp === null) return { label, action: 'auth' }
    // 免費 → 可訂閱
    return { label, action: 'subscribe' }
  }

  return (
    <div className="space-y-6">
      <ErrorAlert message={error} />

      <ul className="space-y-4">
        {PLAN_CARDS.map((plan) => {
          const cta = ctaFor(plan)
          const isCurrent = currentPlan === plan.id
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
                  <li
                    key={feature.label}
                    className={`flex items-start gap-3 text-sm ${feature.soon ? 'text-muted' : 'text-text'}`}
                  >
                    <Icon
                      name="check"
                      className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${feature.soon ? 'text-faint' : 'text-brand'}`}
                    />
                    <span>
                      {feature.label}
                      {feature.soon && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-info-tint px-1.5 py-0.5 text-[10px] font-semibold text-info align-middle">
                          即將推出
                        </span>
                      )}
                    </span>
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
                  disabled={authenticating}
                  loading={authenticating && plan.id === selectedPlan}
                >
                  {authenticating && plan.id === selectedPlan ? '處理中…' : cta.label}
                </Button>
              ) : cta.action === 'manage' ? (
                <Button variant="secondary" onClick={() => router.push('/account/entitlements')}>
                  {cta.label}
                </Button>
              ) : cta.action === 'soon' ? (
                <p className="rounded-md bg-info-tint py-3 text-center text-sm font-medium text-info">
                  {cta.label}
                </p>
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
    </div>
  )
}
