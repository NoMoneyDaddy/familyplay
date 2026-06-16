import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function ChildInfoScreen() {
  const router = useRouter()
  const { session } = useAuthStore()

  const [nickname, setNickname] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = nickname && birthYear && birthMonth

  const handleSubmit = async () => {
    if (!isValid || !session) return

    setLoading(true)
    setError('')

    try {
      const supabase = createMobileClient()

      const { error: createError } = await supabase.from('child_profiles').insert({
        user_id: session.user.id,
        nickname,
        birth_year_month: `${birthYear}-${String(birthMonth).padStart(2, '0')}`,
      })

      if (createError) {
        setError(createError.message || '建立失敗，請重試')
        return
      }

      router.replace('/select')
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請重試')
    } finally {
      setLoading(false)
    }
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

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF8]">
      <ScrollView className="flex-1 px-5 py-8">
        <View className="mb-8 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-[#FF6B35]">認識你的孩子</Text>
            <Text className="mt-2 text-sm text-[#6B7280]">讓我們為你準備最適合的陪伴方案</Text>
          </View>
          <Pressable onPress={handleLogout} className="active:opacity-70">
            <Text className="text-sm text-[#6B7280]">登出</Text>
          </Pressable>
        </View>

        <View className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          {error && (
            <View className="rounded-lg border border-red-200 bg-red-50 p-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <View className="space-y-2">
            <Text className="text-sm font-semibold text-[#1A1A1A]">孩子的暱稱</Text>
            <TextInput
              placeholder="例：小寶、Amy"
              value={nickname}
              onChangeText={setNickname}
              editable={!loading}
              className="rounded-lg border border-[#E5E7EB] px-4 py-3 text-[#1A1A1A]"
            />
          </View>

          <View className="space-y-2">
            <Text className="text-sm font-semibold text-[#1A1A1A]">出生年月</Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-xs text-[#6B7280]">年份</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="rounded-lg border border-[#E5E7EB] p-2"
                >
                  <View className="flex-row gap-2">
                    {YEARS.map((year) => (
                      <Pressable
                        key={year}
                        onPress={() => setBirthYear(String(year))}
                        disabled={loading}
                        className={`rounded-lg px-4 py-2 ${
                          birthYear === String(year) ? 'bg-[#FF6B35]' : 'bg-[#F3F4F6]'
                        } active:opacity-80`}
                      >
                        <Text
                          className={`font-medium ${
                            birthYear === String(year) ? 'text-white' : 'text-[#1A1A1A]'
                          }`}
                        >
                          {year}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View className="flex-1">
                <Text className="mb-2 text-xs text-[#6B7280]">月份</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="rounded-lg border border-[#E5E7EB] p-2"
                >
                  <View className="flex-row gap-2">
                    {MONTHS.map((month) => (
                      <Pressable
                        key={month}
                        onPress={() => setBirthMonth(String(month))}
                        disabled={loading}
                        className={`rounded-lg px-3 py-2 ${
                          birthMonth === String(month) ? 'bg-[#FF6B35]' : 'bg-[#F3F4F6]'
                        } active:opacity-80`}
                      >
                        <Text
                          className={`font-medium ${
                            birthMonth === String(month) ? 'text-white' : 'text-[#1A1A1A]'
                          }`}
                        >
                          {month}月
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <Text className="mt-2 text-xs text-[#6B7280]">我們只記錄年月，不記錄完整生日</Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || loading}
            className="rounded-lg bg-[#FF6B35] py-3 active:opacity-80 disabled:opacity-50"
            accessibilityRole="button"
          >
            <Text className="text-center font-semibold text-white">
              {loading ? '建立中...' : '✨ 開始陪伴'}
            </Text>
          </Pressable>

          <Text className="text-center text-xs text-[#6B7280]">你可以之後新增更多孩子</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
