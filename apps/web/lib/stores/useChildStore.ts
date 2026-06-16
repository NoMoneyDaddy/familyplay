'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Child {
  id: string
  nickname: string
  stageKey?: string
  birthYearMonth?: string
}

interface ChildStore {
  selectedChildId: string | null
  children: Child[]
  setSelectedChildId: (id: string | null) => void
  setChildren: (children: Child[]) => void
  hasHydrated: boolean
  setHasHydrated: (hydrated: boolean) => void
}

export const useChildStore = create<ChildStore>()(
  persist(
    (set) => ({
      selectedChildId: null,
      children: [],
      hasHydrated: false,
      setSelectedChildId: (id: string | null) => set({ selectedChildId: id }),
      setChildren: (children: Child[]) => {
        set((state) => {
          // If selected child is no longer in the list, clear selection
          const selectedStillExists = children.some((c) => c.id === state.selectedChildId)
          return {
            children,
            selectedChildId: selectedStillExists ? state.selectedChildId : children[0]?.id || null,
          }
        })
      },
      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),
    }),
    {
      name: 'child-store',
    },
  ),
)
