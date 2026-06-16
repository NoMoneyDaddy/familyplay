import { createMobileClient } from '@/lib/supabase/mobile'
import * as AuthSession from 'expo-auth-session'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')

      const supabase = createMobileClient()

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: `${process.env.EXPO_PUBLIC_APP_URL || 'familyplay://auth/callback'}`,
        },
      })

      if (signInError) {
        setError(signInError.message || 'Google 登入失敗')
        return
      }

      if (data?.url) {
        // @ts-expect-error expo-auth-session API version mismatch
        const result = await AuthSession.startAsync({
          authUrl: data.url,
          returnUrl: `${process.env.EXPO_PUBLIC_APP_URL || 'familyplay://auth/callback'}`,
        })

        if (result.type === 'success') {
          router.replace('/onboarding/child-info')
        } else if (result.type !== 'dismiss') {
          setError('登入被中止')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 登入失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = () => {
    router.push('/auth/email')
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5 py-8">
        <View className="flex-1 items-center justify-center">
          <View className="mb-20 w-full space-y-2">
            <Text className="text-center text-4xl font-bold text-[#FF6B35]">FamilyPlay</Text>
            <Text className="text-center text-base text-[#6B7280]">30 秒找到今天的陪伴方式</Text>
          </View>

          <View className="w-full space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <Text className="text-center font-semibold text-[#1A1A1A]">選擇登入方式</Text>

            {error && (
              <View className="rounded-lg border border-red-200 bg-red-50 p-4">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            )}

            <Pressable
              disabled={loading}
              onPress={handleGoogleSignIn}
              className={`rounded-lg border-2 border-[#E5E7EB] py-4 active:opacity-80 ${loading ? 'opacity-50' : ''}`}
              accessibilityLabel="用 Google 帳號登入"
              accessibilityRole="button"
            >
              <Text className="text-center font-semibold text-[#1A1A1A]">
                🔐 用 Google 帳號登入
              </Text>
            </Pressable>

            <View className="my-2 flex-row items-center">
              <View className="flex-1 border-t border-[#E5E7EB]" />
              <Text className="mx-3 text-xs text-[#9CA3AF]">或</Text>
              <View className="flex-1 border-t border-[#E5E7EB]" />
            </View>

            <Pressable
              disabled={loading}
              onPress={handleEmailSignUp}
              className={`rounded-lg border-2 border-[#E5E7EB] py-4 active:opacity-80 ${loading ? 'opacity-50' : ''}`}
              accessibilityLabel="用 Email 登入"
              accessibilityRole="button"
            >
              <Text className="text-center font-semibold text-[#1A1A1A]">
                ✉️ 用 Email 登入或註冊
              </Text>
            </Pressable>

            <Text className="text-center text-xs text-[#6B7280]">
              你的資料使用 Supabase 安全保護
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
