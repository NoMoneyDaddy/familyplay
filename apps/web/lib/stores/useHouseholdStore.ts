import { create } from 'zustand'

export interface HouseholdMember {
  id: string
  displayName: string
  role: 'owner' | 'caregiver' | 'viewer'
  nickname?: string
  isSelf?: boolean
  joinedAt: string
}

export interface HouseholdStore {
  householdId: string | null
  members: HouseholdMember[]
  role: 'owner' | 'caregiver' | 'viewer' | null
  setHouseholdId: (id: string) => void
  setMembers: (members: HouseholdMember[]) => void
  setRole: (role: 'owner' | 'caregiver' | 'viewer') => void
  clear: () => void
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
  householdId: null,
  members: [],
  role: null,
  setHouseholdId: (id: string) => set({ householdId: id }),
  setMembers: (members: HouseholdMember[]) => set({ members }),
  setRole: (role: 'owner' | 'caregiver' | 'viewer') => set({ role }),
  clear: () => set({ householdId: null, members: [], role: null }),
}))
