import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required',
  )
}

// 單例：多個 createClient 實例會各自持有獨立的 auth 狀態（且會跳「Multiple GoTrueClient
// instances」警告），導致某畫面登入後，其他畫面與 _layout 的 onAuthStateChange 收不到事件、
// session 不同步。全 App 共用同一個 client，登入/登出才會一致傳播。
let client: SupabaseClient | null = null

export function createMobileClient(): SupabaseClient {
  if (client) return client
  client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  return client
}

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (err) {
      console.error('SecureStore getItem error:', err)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (err) {
      console.error('SecureStore setItem error:', err)
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (err) {
      console.error('SecureStore removeItem error:', err)
    }
  },
}
