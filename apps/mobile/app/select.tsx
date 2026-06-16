import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMobileClient } from '@/lib/supabase/mobile'
import { useAuthStore } from '@/lib/stores/useAuthStore'

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
        const { data, error: fetchError } = await supabase
          .from('child_profiles')
          .select('*')
          .eq('user_id', session.user.id)

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
    router.push(`/(app)/recommendations?childId=${childId}`)
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
      <SafeAreaView className="flex-1 items-center justify-center bg-[#FAFAF8]">
        <Text className="text-[#6B7280]">載入中...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF8]">
      <View className="flex-1 px-5 py-8">
        <View className="mb-8 flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-[#FF6B35]">選擇孩子</Text>
          <Pressable onPress={handleLogout} className="active:opacity-70">
            <Text className="text-sm text-[#6B7280]">登出</Text>
          </Pressable>
        </View>

        {error && (
          <View className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {children.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-center text-[#6B7280]">尚未新增任何孩子</Text>
            <Pressable
              onPress={() => router.push('/onboarding/child-info')}
              className="mt-4 rounded-lg bg-[#FF6B35] px-6 py-3 active:opacity-80"
            >
              <Text className="font-semibold text-white">+ 新增孩子</Text>
            </Pressable>
          </View>
        ) : (
          <View className="space-y-3">
            {children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => handleSelectChild(child.id)}
                className="rounded-xl bg-white p-6 shadow-sm active:opacity-80"
              >
                <Text className="text-2xl font-bold text-[#FF6B35]">{child.nickname}</Text>
                <Text className="mt-1 text-sm text-[#6B7280]">
                  出生年月：{child.birth_year_month}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => router.push('/onboarding/child-info')}
              className="mt-4 rounded-lg border-2 border-dashed border-[#E5E7EB] py-6 active:opacity-80"
            >
              <Text className="text-center text-lg font-semibold text-[#6B7280]">
                + 新增孩子
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
