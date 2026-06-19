import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'

interface ProfileData {
  displayName: string
  avatarUrl: string | null
}

export default function ProfileScreen() {
  const router = useRouter()
  const { session } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 原生沒有相對路徑的 origin，fetch('/api/profile') 會失敗；直接查 Supabase（RLS 限本人）。
        if (!session) {
          setError('Failed to load profile')
          return
        }
        const supabase = createMobileClient()
        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('auth_user_id', session.user.id)
          .single()

        if (fetchError || !data) {
          throw fetchError ?? new Error('No profile')
        }
        setProfile({ displayName: data.display_name, avatarUrl: data.avatar_url })
      } catch (err: unknown) {
        console.error('Failed to fetch profile:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [session])

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    )
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <ScrollView className="flex-1" contentContainerClassName="px-6 py-8">
          <View className="bg-red-50 border border-red-200 rounded-lg p-4">
            <Text className="text-red-900 font-semibold mb-4">
              {error || 'Failed to load profile'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-200 rounded-lg py-3 px-4"
          >
            <Text className="text-gray-900 text-center font-semibold">Go Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            {profile.displayName || 'Profile'}
          </Text>
          <Text className="text-gray-600">Manage your account</Text>
        </View>

        {/* Account Info */}
        <View className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Account</Text>
          <View className="space-y-2">
            <Text className="text-gray-600">Email: {session?.user?.email || 'Not available'}</Text>
            <Text className="text-gray-600">
              User ID: {session?.user?.id?.substring(0, 8) || 'Not available'}...
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={() => router.push('/auth/logout')}
          className="bg-red-600 active:bg-red-700 rounded-lg py-3 px-4"
        >
          <Text className="text-white text-center font-semibold">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
