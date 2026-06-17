// Sprint 1 骨架首頁 — 完整 UI Sprint 5 實作
import { COLORS } from '@familyplay/core'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View className="flex-1 items-center justify-center px-5">
        <Text style={{ color: COLORS.brand }} className="text-3xl font-bold mb-2">
          FamilyPlay
        </Text>
        <Text style={{ color: COLORS.muted }} className="mb-8">
          30 秒找到今天的陪伴方式
        </Text>

        <View
          style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
          className="w-full rounded-2xl p-6 shadow-sm border mb-6"
        >
          <Text style={{ color: COLORS.muted }} className="text-sm mb-2">
            示範引導卡
          </Text>
          <Text style={{ color: COLORS.text }} className="text-xl font-semibold mb-2">
            問你一件今天的事
          </Text>
          <Text style={{ color: COLORS.brand }} className="text-2xl font-bold">
            你今天有什麼讓你開心的事嗎？
          </Text>
        </View>

        <Pressable
          style={{ backgroundColor: COLORS.brand }}
          className="w-full rounded-xl py-4 items-center active:opacity-90"
          accessibilityLabel="快給我一個陪伴方案"
          accessibilityRole="button"
        >
          <Text className="text-lg font-bold text-white">🧡 快給我一個</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
