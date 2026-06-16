'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface PricingPageState {
  loading: boolean
  authenticating: boolean
  currentPlan: string | null
  selectedPlan: 'supporter' | 'plus' | null
  error: string | null
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

  // Check authentication and current plan on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profileResponse = await fetch('/api/profile')
        if (!profileResponse.ok) {
          setState((prev) => ({ ...prev, currentPlan: null, loading: false }))
          return
        }

        const profile = await profileResponse.json()
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

  const handleSubscribe = async (planId: 'supporter' | 'plus') => {
    setState((prev) => ({
      ...prev,
      selectedPlan: planId,
      authenticating: true,
      error: null,
    }))

    try {
      // Check authentication first
      const profileResponse = await fetch('/api/profile')
      if (!profileResponse.ok) {
        router.push('/auth')
        return
      }

      // Create checkout session
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
          error: error.error || 'Failed to create checkout',
        }))
        return
      }

      const { checkoutUrl } = await checkoutResponse.json()

      // Redirect to LemonSqueezy checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Checkout error:', error)
      setState((prev) => ({
        ...prev,
        selectedPlan: null,
        authenticating: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      }))
    }
  }

  const planCards = [
    {
      id: 'supporter',
      name: 'Supporter',
      price: '$5',
      period: '/month',
      description: 'Support FamilyPlay development',
      features: [
        'Ad-free experience',
        'Save activities to history',
        'Family member support',
        'Export companion logs',
      ],
      ctaLabel: state.currentPlan === 'supporter' ? 'Current Plan' : 'Subscribe Now',
      ctaDisabled: state.currentPlan === 'supporter',
    },
    {
      id: 'plus',
      name: 'Plus',
      price: '$15',
      period: '/month',
      description: 'Full suite with AI generation',
      features: [
        'Everything in Supporter',
        'AI-powered activity generation',
        'Encrypted notes on activities',
        '100 AI calls per month',
        'Handoff summaries',
        'Priority support',
      ],
      ctaLabel: state.currentPlan === 'plus' ? 'Current Plan' : 'Subscribe Now',
      ctaDisabled: state.currentPlan === 'plus',
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">Pricing Plans</h1>
          <p className="text-[--color-muted]">Choose the plan that works best for you</p>
        </div>

        {state.loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : state.currentPlan === null ? (
          /* Not authenticated */
          <div className="space-y-4 rounded-xl bg-blue-50 p-6 text-center">
            <p className="text-sm text-blue-900">Please sign in to subscribe to a plan.</p>
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="rounded-lg bg-[--color-brand] px-6 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Free plan notice */}
            {state.currentPlan === 'free' && (
              <div className="rounded-lg bg-amber-50 p-4 text-sm">
                <p className="font-semibold text-amber-900">💡 You're on the Free plan</p>
                <p className="mt-1 text-amber-800">
                  Upgrade to unlock more features and support development.
                </p>
              </div>
            )}

            {/* Error message */}
            {state.error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm">
                <p className="font-semibold text-red-900">Error</p>
                <p className="mt-1 text-red-800">{state.error}</p>
              </div>
            )}

            {/* Plan cards */}
            <div className="space-y-4">
              {planCards.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 transition-all ${
                    plan.id === state.selectedPlan
                      ? 'border-[--color-brand] bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Badge for current plan */}
                  {state.currentPlan === plan.id && (
                    <div className="absolute -right-3 -top-3 rounded-full bg-[--color-brand] px-3 py-1 text-xs font-semibold text-white">
                      Current
                    </div>
                  )}

                  <div className="mb-4 space-y-2">
                    <h2 className="text-xl font-bold text-[--color-text]">{plan.name}</h2>
                    <p className="text-sm text-[--color-muted]">{plan.description}</p>
                  </div>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[--color-brand]">{plan.price}</span>
                    <span className="text-[--color-muted]">{plan.period}</span>
                  </div>

                  <ul className="mb-6 space-y-2">
                    {plan.features.map((feature, idx) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Plan features are static and ordered
                      <li key={idx} className="flex items-start gap-3 text-sm text-[--color-text]">
                        <span className="mt-0.5 flex-shrink-0 text-[--color-brand]">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleSubscribe(plan.id as 'supporter' | 'plus')}
                    disabled={plan.ctaDisabled || state.authenticating}
                    className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
                      plan.ctaDisabled
                        ? 'cursor-default bg-gray-100 text-[--color-muted]'
                        : 'bg-[--color-brand] text-white hover:opacity-90 disabled:opacity-50'
                    }`}
                  >
                    {state.authenticating && plan.id === state.selectedPlan ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </span>
                    ) : (
                      plan.ctaLabel
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* FAQ section */}
            <div className="space-y-4 rounded-xl bg-gray-50 p-6">
              <h3 className="font-semibold text-[--color-text]">Questions?</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-[--color-text]">Can I upgrade anytime?</p>
                  <p className="mt-1 text-[--color-muted]">
                    Yes, upgrade from Free to Supporter or Plus anytime.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[--color-text]">How do I cancel?</p>
                  <p className="mt-1 text-[--color-muted]">
                    Manage your subscription in your account settings. You can cancel anytime.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
