import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Text as RNText, TextInput as RNTextInput } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'

// 全域字體放大上限：系統「大字」無障礙設定下文字仍會放大（保留無障礙），但封頂避免極端放大
// （iOS 可達 ~3.5x）把版面撐爆、按鈕被擠出畫面。一處設定、全 app 受惠；內文 1.5 兼顧可讀與不爆版。
type WithDefaults = { defaultProps?: { maxFontSizeMultiplier?: number } }
const FONT_SCALE_CAP = 1.5
;(RNText as unknown as WithDefaults).defaultProps = {
  ...(RNText as unknown as WithDefaults).defaultProps,
  maxFontSizeMultiplier: FONT_SCALE_CAP,
}
;(RNTextInput as unknown as WithDefaults).defaultProps = {
  ...(RNTextInput as unknown as WithDefaults).defaultProps,
  maxFontSizeMultiplier: FONT_SCALE_CAP,
}

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

  // SafeAreaProvider 必須掛在最上層，下游各畫面的 SafeAreaView / useSafeAreaInsets 才讀得到正確
  // 安全區（瀏海、底部 home indicator）。先前缺此 Provider，insets 在部分情境會失準。
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAF6F0' },
          headerTintColor: '#241F1B',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FAF6F0' },
        }}
      />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  )
}
