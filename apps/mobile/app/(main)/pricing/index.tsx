import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PricingScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-3xl font-bold text-gray-900 mb-4">Premium Features</Text>
        <Text className="text-gray-600 text-center mb-8">
          Premium subscription features coming soon in a future update.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-600 rounded-lg py-3 px-6 active:bg-blue-700"
        >
          <Text className="text-white text-center font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
