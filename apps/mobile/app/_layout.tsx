import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)
  const setIsLoading = useAuthStore((s) => s.setIsLoading)

  useEffect(() => {
    const supabase = createMobileClient()
    // 啟動時還原持久化的 session（存在 SecureStore），否則每次重開 App 都被當成未登入。
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })
    // 後續登入/登出/換 token 即時同步進 store（client 為單例，全 App 共用此事件源）。
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [setSession, setIsLoading])

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAF6F0' },
          headerTintColor: '#241F1B',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FAF6F0' },
        }}
      />
      <StatusBar style="dark" />
    </>
  )
}
