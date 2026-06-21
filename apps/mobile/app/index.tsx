import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Mascot } from '@/components/Mascot'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { colors } from '@/lib/theme'

/**
 * 進入點：依登入狀態導向。已登入 → 選孩子流程（/select）；未登入 → 顯示歡迎與登入。
 * 取代原 Sprint-1 骨架（含假的示範卡），與 Web `/` 的導向行為一致。
 */
export default function HomeScreen() {
  const router = useRouter()
  const { session, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && session) router.replace('/now')
  }, [isLoading, session, router])

  // 還原 session 中，或已登入（即將導向）→ 顯示載入，不閃動歡迎畫面
  if (isLoading || session) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    )
  }

  // 未登入：歡迎 + 登入 CTA
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="mb-5 items-center justify-center"
          style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.brandTint }}
        >
          <Mascot size={60} />
        </View>
        <Text className="mb-2 text-3xl font-bold" style={{ color: colors.brand }}>
          FamilyPlay
        </Text>
        <Text className="mb-10 text-center" style={{ color: colors.muted }}>
          給疲憊的你，30 秒拿到今天的親子陪伴方案
        </Text>

        <Pressable
          onPress={() => router.push('/auth/login')}
          accessibilityRole="button"
          accessibilityLabel="登入或註冊"
          className="w-full items-center rounded-2xl py-4 active:opacity-90"
          style={{ backgroundColor: colors.brand }}
        >
          <Text className="text-lg font-bold text-white">開始使用</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
