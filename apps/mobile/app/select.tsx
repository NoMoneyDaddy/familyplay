import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Mascot } from '@/components/Mascot'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'
import { brandGradient, clayCard, colors } from '@/lib/theme'

interface ChildProfile {
  id: string
  nickname: string
  birth_year_month: string
}

export default function SelectScreen() {
  const router = useRouter()
  const { session } = useAuthStore()

  const [children, setChildren] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadChildren = async () => {
      if (!session) {
        router.replace('/auth/login')
        return
      }

      try {
        const supabase = createMobileClient()
        // child_profiles 無 user_id 欄位；以 RLS（household 成員）過濾即可，
        // 與 Web 的 /api/children/list 一致。原本 .eq('user_id', …) 會因欄位不存在而報錯。
        const { data, error: fetchError } = await supabase
          .from('child_profiles')
          .select('id,nickname,birth_year_month')
          .order('created_at', { ascending: false })

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        setChildren(data || [])
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

  const handleLogout = async () => {
    try {
      const supabase = createMobileClient()
      await supabase.auth.signOut()
      router.replace('/auth/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
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
      <View className="flex-1 px-5 py-8">
        <View className="mb-8 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            選擇孩子
          </Text>
          <Pressable onPress={handleLogout} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              登出
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
          <View className="space-y-3">
            {children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => handleSelectChild(child.id)}
                className="rounded-2xl p-6 active:opacity-80"
                style={{ backgroundColor: colors.card, ...clayCard }}
              >
                <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                  {child.nickname}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
                  出生年月：{child.birth_year_month}
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
      </View>
    </SafeAreaView>
  )
}
