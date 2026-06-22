import * as AuthSession from 'expo-auth-session'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Mascot } from '@/components/Mascot'
import { createMobileClient } from '@/lib/supabase/mobile'
import { brandGradient, clayCard, colors } from '@/lib/theme'

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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 32,
        }}
      >
        {/* Hero：吉祥物徽章 + 標題 */}
        <View className="mb-10 items-center">
          <LinearGradient
            colors={brandGradient}
            style={{
              width: 80,
              height: 80,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              ...clayCard,
            }}
          >
            <Mascot size={52} />
          </LinearGradient>
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            FamilyPlay
          </Text>
          <Text className="mt-1 text-base" style={{ color: colors.muted }}>
            30 秒找到今天的陪伴方式
          </Text>
        </View>

        {/* 登入卡 */}
        <View
          className="w-full rounded-3xl p-6"
          style={{ backgroundColor: colors.card, ...clayCard }}
        >
          {error ? (
            <View className="mb-4 rounded-xl p-3" style={{ backgroundColor: colors.dangerTint }}>
              <Text className="text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            disabled={loading}
            onPress={handleGoogleSignIn}
            className={`rounded-2xl py-4 active:opacity-80 ${loading ? 'opacity-50' : ''}`}
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            accessibilityLabel="用 Google 帳號登入"
            accessibilityRole="button"
          >
            <Text className="text-center text-base font-semibold" style={{ color: colors.text }}>
              用 Google 登入
            </Text>
          </Pressable>

          <View className="my-4 flex-row items-center">
            <View className="flex-1 border-t" style={{ borderColor: colors.border }} />
            <Text className="mx-3 text-xs" style={{ color: colors.faint }}>
              或
            </Text>
            <View className="flex-1 border-t" style={{ borderColor: colors.border }} />
          </View>

          <Pressable
            disabled={loading}
            onPress={handleEmailSignUp}
            className={`overflow-hidden rounded-2xl active:opacity-90 ${loading ? 'opacity-50' : ''}`}
            accessibilityLabel="用 Email 登入或註冊"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={brandGradient}
              style={{ paddingVertical: 16, alignItems: 'center' }}
            >
              <Text className="text-center text-base font-semibold text-white">
                用 Email 登入或註冊
              </Text>
            </LinearGradient>
          </Pressable>

          <Text className="mt-4 text-center text-xs" style={{ color: colors.muted }}>
            你的資料都已加密保護，安全又隱私
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
