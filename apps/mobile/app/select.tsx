import { type ChildSummary, fetchChildren } from '@familyplay/data'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Mascot } from '@/components/Mascot'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'
import { brandGradient, clayCard, colors } from '@/lib/theme'

export default function SelectScreen() {
  const router = useRouter()
  const { session } = useAuthStore()

  const [children, setChildren] = useState<ChildSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadChildren = async () => {
      if (!session) {
        router.replace('/auth/login')
        return
      }

      try {
        // 收斂到 @familyplay/data 的 fetchChildren（與 Web 共用）：RLS 依 household 成員過濾。
        const supabase = createMobileClient()
        setChildren(await fetchChildren(supabase))
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗')
      } finally {
        setLoading(false)
      }
    }

    loadChildren()
  }, [session, router])

  const handleSelectChild = (childId: string) => {
    router.push(`/recommendations?childId=${childId}`)
  }

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <Text style={{ color: colors.muted }}>載入中...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 32 }}
      >
        <View className="mb-8 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            選擇孩子
          </Text>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="帳號"
            className="active:opacity-70"
          >
            <Text className="text-sm" style={{ color: colors.muted }}>
              帳號
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View className="mb-6 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {children.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View
              className="mb-4 items-center justify-center"
              style={{
                width: 88,
                height: 88,
                borderRadius: 28,
                backgroundColor: colors.brandTint,
              }}
            >
              <Mascot size={60} />
            </View>
            <Text className="text-center text-base" style={{ color: colors.muted }}>
              還沒有孩子檔案
            </Text>
            {/* overflow-hidden 會在 iOS 把 clayCard 陰影裁掉，改把圓角放到內層 LinearGradient */}
            <Pressable
              onPress={() => router.push('/onboarding/child-info')}
              className="mt-5 active:opacity-90"
              style={clayCard}
            >
              <LinearGradient
                colors={brandGradient}
                style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}
              >
                <Text className="font-semibold text-white">新增第一個孩子</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            {children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => handleSelectChild(child.id)}
                className="rounded-2xl p-6 active:opacity-80"
                style={{ backgroundColor: colors.card, ...clayCard }}
              >
                <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                  {child.nickname || '寶寶'}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
                  出生年月：{child.birthYearMonth}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => router.push('/onboarding/child-info')}
              className="mt-4 rounded-2xl py-6 active:opacity-80"
              style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border }}
            >
              <Text className="text-center text-lg font-semibold" style={{ color: colors.muted }}>
                + 新增孩子
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
