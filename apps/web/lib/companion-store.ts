// 陪伴流程的前端狀態（家長當下的選擇）。
// 僅保存 UI 選擇；實際推薦由 /api/recommend 完成。

import type { ResourceKey, SpaceContext } from '@familyplay/ai'
import type { CompanionContext, ParentEnergy } from '@familyplay/core'
import { create } from 'zustand'

export interface RecommendRequestBody {
  ageMonths: number
  parentEnergy: ParentEnergy
  companionContext: CompanionContext
  space: SpaceContext
  availableMinutes: number
  availableResources: ResourceKey[]
}

interface CompanionSelections {
  ageMonths: number | null
  parentEnergy: ParentEnergy | null
  companionContext: CompanionContext
  space: SpaceContext
  availableMinutes: number | null
  availableResources: ResourceKey[]
}

interface CompanionActions {
  setAgeMonths: (value: number) => void
  setParentEnergy: (value: ParentEnergy) => void
  setCompanionContext: (value: CompanionContext) => void
  setSpace: (value: SpaceContext) => void
  setAvailableMinutes: (value: number) => void
  toggleResource: (value: ResourceKey) => void
  reset: () => void
  isReady: () => boolean
  toRequestBody: () => RecommendRequestBody | null
}

const initialSelections: CompanionSelections = {
  ageMonths: null,
  parentEnergy: null,
  companionContext: 'normal',
  space: 'anywhere',
  availableMinutes: null,
  availableResources: [],
}

export const useCompanionStore = create<CompanionSelections & CompanionActions>((set, get) => ({
  ...initialSelections,

  setAgeMonths: (ageMonths) => set({ ageMonths }),
  setParentEnergy: (parentEnergy) => set({ parentEnergy }),
  setCompanionContext: (companionContext) => set({ companionContext }),
  setSpace: (space) => set({ space }),
  setAvailableMinutes: (availableMinutes) => set({ availableMinutes }),
  toggleResource: (resource) =>
    set((state) => ({
      availableResources: state.availableResources.includes(resource)
        ? state.availableResources.filter((r) => r !== resource)
        : [...state.availableResources, resource],
    })),

  reset: () => set({ ...initialSelections }),

  isReady: () => {
    const s = get()
    return s.ageMonths !== null && s.parentEnergy !== null && s.availableMinutes !== null
  },

  toRequestBody: () => {
    const s = get()
    if (s.ageMonths === null || s.parentEnergy === null || s.availableMinutes === null) {
      return null
    }
    return {
      ageMonths: s.ageMonths,
      parentEnergy: s.parentEnergy,
      companionContext: s.companionContext,
      space: s.space,
      availableMinutes: s.availableMinutes,
      availableResources: s.availableResources,
    }
  },
}))
