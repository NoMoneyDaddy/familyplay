import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RevenueCatError, showPurchaseUI } from '~/lib/revenue-cat'
import { useSubscriptionStore } from '~/lib/stores/useSubscriptionStore'

export default function PricingScreen() {
  const router = useRouter()
  const { plan, plusEndsAt, isLoading, setIsLoading, error, setError } = useSubscriptionStore()
  const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null)

  useEffect(() => {
    // Clear any previous errors when screen loads
    setError(null)
  }, [setError])

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasingProduct(productId)
      setError(null)
      setIsLoading(true)

      await showPurchaseUI(productId)
      // Purchase completion is handled by the root layout listener
    } catch (err) {
      const message =
        err instanceof RevenueCatError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to initiate purchase'

      setError(message)
      Alert.alert('Purchase Error', message, [{ text: 'OK', onPress: () => setError(null) }])
    } finally {
      setIsLoading(false)
      setPurchasingProduct(null)
    }
  }

  const isCurrentPlan = (targetPlan: string) => plan === targetPlan && !isLoading

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Support FamilyPlay</Text>
          <Text className="text-gray-600">Unlock more features and help us improve the app.</Text>
        </View>

        {/* Current Plan Banner */}
        {plan !== 'free' && (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <Text className="text-green-900 font-semibold">
              Current Plan: {plan === 'supporter' ? 'Supporter' : 'Plus'}
            </Text>
            {plusEndsAt && (
              <Text className="text-green-700 text-sm mt-1">
                Expires {new Date(plusEndsAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <Text className="text-red-900">{error}</Text>
          </View>
        )}

        {/* Free Tier */}
        <View className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Free</Text>
            <Text className="text-gray-500">Forever</Text>
          </View>

          <Text className="text-2xl font-bold text-gray-900 mb-6">$0</Text>

          <View className="space-y-3 mb-6">
            <FeatureRow icon="✓" text="5 activities per day" />
            <FeatureRow icon="✓" text="Basic recommendations" />
            <FeatureRow icon="✓" text="Activity logging" />
            <FeatureRow icon="✗" text="AI-generated ideas" />
            <FeatureRow icon="✗" text="Encrypted notes" />
          </View>

          {plan === 'free' ? (
            <View className="bg-gray-100 rounded-lg py-3 px-4">
              <Text className="text-gray-700 text-center font-semibold">Current Plan</Text>
            </View>
          ) : null}
        </View>

        {/* Supporter Tier */}
        <View className="bg-white rounded-lg border border-orange-200 p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Supporter</Text>
            <View className="bg-orange-100 px-3 py-1 rounded-full">
              <Text className="text-orange-700 text-xs font-semibold">Popular</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              $4.99
              <Text className="text-lg font-normal text-gray-500">/month</Text>
            </Text>
          </View>

          <View className="space-y-3 mb-6">
            <FeatureRow icon="✓" text="Unlimited activities" />
            <FeatureRow icon="✓" text="Smart recommendations" />
            <FeatureRow icon="✓" text="Detailed activity logging" />
            <FeatureRow icon="✗" text="AI-generated ideas" />
            <FeatureRow icon="✗" text="Encrypted notes" />
          </View>

          {isCurrentPlan('supporter') ? (
            <View className="bg-gray-100 rounded-lg py-3 px-4">
              <Text className="text-gray-700 text-center font-semibold">Current Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => handlePurchase('com.familyplay.supporter.monthly')}
              disabled={isLoading || purchasingProduct !== null}
              className="bg-orange-500 rounded-lg py-3 px-4 active:bg-orange-600"
            >
              {purchasingProduct === 'com.familyplay.supporter.monthly' ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">Subscribe Now</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Plus Tier */}
        <View className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Plus</Text>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-blue-700 text-xs font-semibold">Most Popular</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              $14.99
              <Text className="text-lg font-normal text-gray-500">/month</Text>
            </Text>
          </View>

          <View className="space-y-3 mb-6">
            <FeatureRow icon="✓" text="Everything in Supporter" />
            <FeatureRow icon="✓" text="AI-generated activity ideas" />
            <FeatureRow icon="✓" text="Encrypted private notes" />
            <FeatureRow icon="✓" text="100 AI calls per month" />
            <FeatureRow icon="✓" text="Priority support" />
          </View>

          {isCurrentPlan('plus') ? (
            <View className="bg-gray-100 rounded-lg py-3 px-4">
              <Text className="text-gray-700 text-center font-semibold">Current Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => handlePurchase('com.familyplay.plus.monthly')}
              disabled={isLoading || purchasingProduct !== null}
              className="bg-blue-600 rounded-lg py-3 px-4 active:bg-blue-700"
            >
              {purchasingProduct === 'com.familyplay.plus.monthly' ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">Subscribe Now</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View className="bg-gray-50 rounded-lg p-4 mb-4">
          <Text className="text-gray-700 text-sm leading-5">
            Subscriptions are billed monthly to your App Store or Google Play account. Cancel
            anytime in app settings.
          </Text>
        </View>

        {/* Back Button */}
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

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <Text className={`text-lg mr-3 ${icon === '✓' ? 'text-green-600' : 'text-gray-300'}`}>
        {icon}
      </Text>
      <Text className={icon === '✓' ? 'text-gray-900' : 'text-gray-500'}>{text}</Text>
    </View>
  )
}
