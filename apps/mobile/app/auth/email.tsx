import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMobileClient } from '@/lib/supabase/mobile'

type EmailTab = 'login' | 'signup'

export default function EmailAuthScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<EmailTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('請填入 Email 和密碼')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const supabase = createMobileClient()

      if (tab === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          if (signUpError.message?.includes('already registered')) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            })

            if (signInError) {
              setError('Email 或密碼不正確')
              return
            }

            router.replace('/onboarding/child-info')
          } else {
            setError(signUpError.message || '註冊失敗')
          }
        } else if (data.user) {
          setSuccess('註冊成功！請檢查你的 email 以驗證帳號')
          setEmail('')
          setPassword('')
          setTimeout(() => {
            setTab('login')
            setSuccess('')
          }, 3000)
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError('Email 或密碼不正確')
          return
        }

        router.replace('/onboarding/child-info')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5 py-8">
        <View className="mb-8 flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
            <Text className="text-lg text-[#FF6B35]">← 返回</Text>
          </Pressable>
          <Text className="flex-1 text-xl font-bold text-[#241F1B]">Email 登入</Text>
        </View>

        <View className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          {error && (
            <View className="rounded-lg border border-red-200 bg-red-50 p-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          {success && (
            <View className="rounded-lg border border-green-200 bg-green-50 p-4">
              <Text className="text-sm text-green-700">{success}</Text>
            </View>
          )}

          <View className="flex-row gap-2 rounded-lg bg-[#F1EBE2] p-1">
            <Pressable
              onPress={() => {
                setTab('login')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 rounded-md py-2 ${tab === 'login' ? 'bg-white' : ''}`}
              disabled={loading}
            >
              <Text
                className={`text-center font-medium ${tab === 'login' ? 'text-[#FF6B35]' : 'text-[#241F1B]'}`}
              >
                登入
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTab('signup')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 rounded-md py-2 ${tab === 'signup' ? 'bg-white' : ''}`}
              disabled={loading}
            >
              <Text
                className={`text-center font-medium ${tab === 'signup' ? 'text-[#FF6B35]' : 'text-[#241F1B]'}`}
              >
                註冊
              </Text>
            </Pressable>
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-[#241F1B]">Email</Text>
            <TextInput
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
              className="rounded-lg border border-[#ECE5DB] px-4 py-3 text-[#241F1B]"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-[#241F1B]">密碼</Text>
            <View className="flex-row items-center rounded-lg border border-[#ECE5DB]">
              <TextInput
                placeholder="至少 8 個字元"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry={!showPassword}
                className="flex-1 px-4 py-3 text-[#241F1B]"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="mr-4 active:opacity-70"
                disabled={loading}
              >
                <Text className="text-xs text-[#6B615A]">{showPassword ? '隱藏' : '顯示'}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleEmailAuth}
            disabled={loading || !email || !password}
            className="rounded-lg bg-[#FF6B35] py-3 active:opacity-80 disabled:opacity-50"
            accessibilityRole="button"
          >
            <Text className="text-center font-semibold text-white">
              {loading ? '處理中...' : tab === 'signup' ? '建立帳號' : '登入'}
            </Text>
          </Pressable>

          <Text className="text-center text-xs text-[#6B615A]">
            {tab === 'signup' ? '首次登入時會自動建立帳號' : ''}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
