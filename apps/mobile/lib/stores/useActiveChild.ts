import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

// 「目前選定的孩子」跨畫面共享 + 持久化。多孩子家庭在 /children 切換後，/now 等畫面要記得
// 上次選的是誰（重開 App 也不重置）。childId 是 UUID、非敏感，但行動端只有 SecureStore 可用
// （未引入 AsyncStorage），小字串存這裡沒問題。RLS 仍由帶 session 的 client 把關，store 只是
// UI 偏好，不構成授權依據。
const KEY = 'familyplay.activeChildId'

interface ActiveChildStore {
  activeChildId: string | null
  // hydrated：是否已從 SecureStore 還原。畫面要等還原完才決定用哪個孩子，避免先用 children[0]
  // 閃一下再跳到記住的孩子。
  hydrated: boolean
  hydrate: () => Promise<void>
  setActiveChild: (id: string | null) => void
}

export const useActiveChildStore = create<ActiveChildStore>((set) => ({
  activeChildId: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const id = await SecureStore.getItemAsync(KEY)
      set({ activeChildId: id, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
  setActiveChild: (id) => {
    set({ activeChildId: id })
    // fire-and-forget 持久化：寫入失敗不影響當下選擇（記憶體已更新），下次重開再退回預設即可。
    if (id) SecureStore.setItemAsync(KEY, id).catch(() => {})
    else SecureStore.deleteItemAsync(KEY).catch(() => {})
  },
}))
