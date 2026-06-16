import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { openSubscriptionSettings } from '~/lib/revenue-cat'
import { useSubscriptionStore } from '~/lib/stores/useSubscriptionStore'

interface ProfileData {
  displayName: string
  avatarUrl: string | null
  plan: 'free' | 'supporter' | 'plus'
  plusEndsAt: string | null
  revenuecatCustomerId: string | null
}

export default function ProfileScreen() {
  const router = useRouter()
  const { session } = useAuthStore()
  const subscription = useSubscriptionStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/profile')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = (await response.json()) as ProfileData
        setProfile(data)

        // Update subscription store with profile data
        subscription.setPlan(data.plan)
        if (data.plusEndsAt) {
          subscription.setPlusEndsAt(new Date(data.plusEndsAt))
        }
        if (data.revenuecatCustomerId) {
          subscription.setRevenuecatCustomerId(data.revenuecatCustomerId)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [subscription])

  const handleManageSubscription = async () => {
    try {
      await openSubscriptionSettings()
    } catch (err) {
      Alert.alert(
        'Error',
        'Could not open subscription settings. Please manage subscriptions in your app store settings.',
      )
    }
  }

  const getPlanDisplayName = (plan: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      supporter: 'Supporter',
      plus: 'Plus',
    }
    return names[plan] || 'Unknown'
  }

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'gray',
      supporter: 'orange',
      plus: 'blue',
    }
    return colors[plan] || 'gray'
  }

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

  const planColor = getPlanColor(profile.plan)
  const planBgColor =
    planColor === 'orange' ? 'bg-orange-50' : planColor === 'blue' ? 'bg-blue-50' : 'bg-gray-50'
  const planBorderColor =
    planColor === 'orange'
      ? 'border-orange-200'
      : planColor === 'blue'
        ? 'border-blue-200'
        : 'border-gray-200'
  const planTextColor =
    planColor === 'orange'
      ? 'text-orange-900'
      : planColor === 'blue'
        ? 'text-blue-900'
        : 'text-gray-900'
  const planBadgeColor =
    planColor === 'orange' ? 'bg-orange-100' : planColor === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
  const planBadgeTextColor =
    planColor === 'orange'
      ? 'text-orange-700'
      : planColor === 'blue'
        ? 'text-blue-700'
        : 'text-gray-700'

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            {profile.displayName || 'Profile'}
          </Text>
          <Text className="text-gray-600">Manage your account and subscription</Text>
        </View>

        {/* Subscription Status Card */}
        <View className={`${planBgColor} border ${planBorderColor} rounded-lg p-6 mb-6`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-xl font-bold ${planTextColor}`}>Subscription Status</Text>
            <View className={`${planBadgeColor} px-3 py-1 rounded-full`}>
              <Text className={`text-sm font-semibold ${planBadgeTextColor}`}>
                {getPlanDisplayName(profile.plan)}
              </Text>
            </View>
          </View>

          {profile.plan === 'plus' && profile.plusEndsAt ? (
            <>
              <Text className={`${planTextColor} text-base mb-4`}>
                Your Plus subscription includes:
              </Text>
              <View className="space-y-2 mb-4">
                <SubscriptionFeature icon="✓" text="100 AI calls per month" />
                <SubscriptionFeature icon="✓" text="AI-generated activity ideas" />
                <SubscriptionFeature icon="✓" text="Encrypted private notes" />
              </View>
              <Text className={`${planTextColor} text-sm mb-4`}>
                Renews {new Date(profile.plusEndsAt).toLocaleDateString()}
              </Text>

              <TouchableOpacity
                onPress={handleManageSubscription}
                className={`${planColor === 'blue' ? 'bg-blue-600 active:bg-blue-700' : 'bg-orange-600 active:bg-orange-700'} rounded-lg py-3 px-4`}
              >
                <Text className="text-white text-center font-semibold">Manage Subscription</Text>
              </TouchableOpacity>
            </>
          ) : profile.plan === 'supporter' ? (
            <>
              <Text className={`${planTextColor} text-base mb-4`}>Supporter includes:</Text>
              <View className="space-y-2 mb-4">
                <SubscriptionFeature icon="✓" text="Unlimited activities" />
                <SubscriptionFeature icon="✓" text="Smart recommendations" />
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(main)/pricing')}
                className="bg-orange-600 active:bg-orange-700 rounded-lg py-3 px-4 mb-3"
              >
                <Text className="text-white text-center font-semibold">Upgrade to Plus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleManageSubscription}
                className="bg-orange-100 rounded-lg py-3 px-4"
              >
                <Text className="text-orange-700 text-center font-semibold">
                  Manage Subscription
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-gray-700 text-base mb-4">
                You're on the free plan. Upgrade to unlock more features.
              </Text>

              <TouchableOpacity
                onPress={() => router.push('/(main)/pricing')}
                className="bg-blue-600 active:bg-blue-700 rounded-lg py-3 px-4"
              >
                <Text className="text-white text-center font-semibold">View Plans</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Account Info */}
        <View className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Account</Text>

          <View className="space-y-4">
            <InfoRow label="Email" value={profile.displayName || 'Not available'} />
            {profile.revenuecatCustomerId && (
              <InfoRow
                label="Subscription ID"
                value={`***${profile.revenuecatCustomerId.slice(-8)}`}
              />
            )}
          </View>
        </View>

        {/* Settings Links */}
        <View className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <TouchableOpacity className="py-4 border-b border-gray-200">
            <Text className="text-gray-900 font-medium">Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-4 border-b border-gray-200">
            <Text className="text-gray-900 font-medium">Privacy & Security</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="py-4"
            onPress={() => Linking.openURL('https://familyplay.app/privacy')}
          >
            <Text className="text-gray-900 font-medium">Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity className="bg-red-50 border border-red-200 rounded-lg py-3 px-4">
          <Text className="text-red-600 text-center font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function SubscriptionFeature({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="text-green-600 text-lg mr-3">{icon}</Text>
      <Text className="text-gray-900">{text}</Text>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-gray-600">{label}</Text>
      <Text className="text-gray-900 font-medium">{value}</Text>
    </View>
  )
}
