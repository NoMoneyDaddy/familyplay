import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  const router = useRouter()
  return (
    <SafeAreaView className="flex-1 bg-[#FAF6F0]">
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-3xl font-bold text-[#FF6B35] mb-2">FamilyPlay</Text>
        <Text className="text-[#6B615A] mb-8">30 秒找到今天的陪伴方式</Text>

        <View className="w-full bg-white rounded-2xl p-6 shadow-sm border border-[#ECE5DB] mb-6">
          <Text className="text-sm text-[#6B615A] mb-2">示範引導卡</Text>
          <Text className="text-xl font-semibold text-[#241F1B] mb-2">問你一件今天的事</Text>
          <Text className="text-2xl font-bold text-[#FF6B35]">你今天有什麼讓你開心的事嗎？</Text>
        </View>

        <Pressable
          onPress={() => router.push('/select')}
          className="w-full bg-[#FF6B35] rounded-xl py-4 items-center active:opacity-90"
          accessibilityLabel="快給我一個陪伴方案"
          accessibilityRole="button"
        >
          <Text className="text-lg font-bold text-white">🧡 快給我一個</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
