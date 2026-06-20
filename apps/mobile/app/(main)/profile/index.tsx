import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

interface ProfileData {
  displayName: string
  avatarUrl: string | null
}

/** 帳號頁：顯示基本資料、訂閱入口、登出。繁中 + 暖色主題（與全 App 一致）。 */
export default function ProfileScreen() {
  const router = useRouter()
  const { session } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // 原生沒有相對路徑 origin，fetch('/api/profile') 會失敗；直接查 Supabase（RLS 限本人）。
        if (!session) {
          setError('無法載入帳號資料')
          return
        }
        const supabase = createMobileClient()
        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('auth_user_id', session.user.id)
          .single()
        if (fetchError || !data) throw fetchError ?? new Error('No profile')
        setProfile({ displayName: data.display_name, avatarUrl: data.avatar_url })
      } catch (err) {
        console.error('Failed to fetch profile:', err)
        setError('無法載入帳號資料')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [session])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await createMobileClient().auth.signOut()
      router.replace('/auth/login')
    } catch (err) {
      console.error('Logout error:', err)
      setLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            帳號
          </Text>
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        <View
          className="mb-4 rounded-2xl p-6"
          style={{ backgroundColor: colors.card, ...clayCard }}
        >
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {profile?.displayName || '家長'}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: colors.muted }}>
            {session?.user?.email || '—'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/pricing')}
          accessibilityRole="button"
          className="mb-3 flex-row items-center justify-between rounded-2xl p-5 active:opacity-80"
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-base font-medium" style={{ color: colors.text }}>
            訂閱方案
          </Text>
          <Text className="text-base" style={{ color: colors.muted }}>
            ›
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          accessibilityRole="button"
          className="mt-4 items-center rounded-2xl py-4 active:opacity-80"
          style={{ borderWidth: 1, borderColor: colors.border, opacity: loggingOut ? 0.6 : 1 }}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text className="font-semibold" style={{ color: colors.danger }}>
              登出
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
