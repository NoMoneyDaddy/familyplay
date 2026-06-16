import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Plan } from '../revenue-cat'

interface SubscriptionState {
  plan: Plan
  revenuecatCustomerId: string | null
  activeEntitlements: string[]
  plusEndsAt: Date | null
  isLoading: boolean
  error: string | null
  hasHydrated: boolean

  // Actions
  setPlan: (plan: Plan) => void
  setRevenuecatCustomerId: (id: string | null) => void
  setActiveEntitlements: (entitlements: string[]) => void
  setPlusEndsAt: (date: Date | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setHasHydrated: (hydrated: boolean) => void
  reset: () => void
}

const initialState = {
  plan: 'free' as const,
  revenuecatCustomerId: null,
  activeEntitlements: [],
  plusEndsAt: null,
  isLoading: false,
  error: null,
  hasHydrated: false,
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      ...initialState,

      setPlan: (plan) => set({ plan }),
      setRevenuecatCustomerId: (id) => set({ revenuecatCustomerId: id }),
      setActiveEntitlements: (entitlements) => set({ activeEntitlements: entitlements }),
      setPlusEndsAt: (date) => set({ plusEndsAt: date }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      reset: () => set(initialState),
    }),
    {
      name: 'subscription-store',
      partialize: (state) => ({
        plan: state.plan,
        revenuecatCustomerId: state.revenuecatCustomerId,
        activeEntitlements: state.activeEntitlements,
        plusEndsAt: state.plusEndsAt ? state.plusEndsAt.toISOString() : null,
      }),
      // biome-ignore lint/suspicious/noExplicitAny: Zustand persist state type
      onRehydrated: (state: any) => {
        // Convert ISO string back to Date
        if (typeof state?.plusEndsAt === 'string') {
          state.plusEndsAt = new Date(state.plusEndsAt)
        }
        state?.setHasHydrated(true)
      },
    },
  ),
)
