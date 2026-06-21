import { useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { clayCard, colors } from '@/lib/theme'

// 本 App 不收費：所有功能免費，靠少量、低干擾的廣告維持營運。
// 與 Web /pricing 對齊——純資訊頁，無任何付費／升級／App 內購入口。
const FEATURES = [
  '核心「30 秒陪伴方案」與完整活動庫，永久免費',
  '發展里程碑、成長紀錄、陪伴日誌與歷史，免費',
  '家庭共享與交接小卡，免費',
  'AI 客製活動：自帶 AI 金鑰即可用（金鑰只存在你的裝置，用完即丟）',
]

/** 行動端「方案」頁：誠實說明免費＋低干擾廣告的商業模式，無付費牆。 */
export default function PricingScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            完全免費
          </Text>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="返回"
            className="active:opacity-70"
          >
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>
        <Text className="mb-5 text-sm" style={{ color: colors.muted }}>
          由少量、低干擾的廣告支持，沒有付費牆。
        </Text>

        {/* 簽名區：暖色說明帶 */}
        <View
          className="mb-5 rounded-2xl p-5"
          style={{ backgroundColor: colors.brandTint, ...clayCard }}
        >
          <Text className="mb-1 text-base font-bold" style={{ color: colors.text }}>
            所有功能都免費
          </Text>
          <Text className="text-sm leading-relaxed" style={{ color: colors.muted }}>
            一鍵陪伴、發展里程碑、成長紀錄、陪伴日誌、家庭共享、交接小卡——全部不收費，
            也沒有任何訂閱或解鎖。我們靠頁面上少量、非干擾式的廣告維持營運。
          </Text>
        </View>

        <View className="mb-5 gap-2.5">
          {FEATURES.map((line) => (
            <View key={line} className="flex-row items-start gap-2.5">
              <Text className="text-sm" style={{ color: colors.success }}>
                ✓
              </Text>
              <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                {line}
              </Text>
            </View>
          ))}
        </View>

        <View className="rounded-2xl p-4" style={{ backgroundColor: colors.infoTint }}>
          <Text className="mb-1 text-sm font-semibold" style={{ color: colors.info }}>
            關於廣告
          </Text>
          <Text className="text-sm leading-relaxed" style={{ color: colors.info }}>
            廣告只出現在瀏覽型頁面（如紀錄、收藏）的底部，不會打斷你和孩子的陪伴流程，
            也不會用到孩子的個人資料。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
