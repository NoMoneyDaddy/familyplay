import { useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { clayCard, colors } from '@/lib/theme'

interface Plan {
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  highlight?: boolean
}

// 與 Web 方案一致；行動端訂閱走 App 內購（RevenueCat），尚未串接 → 標「即將推出」。
const PLANS: Plan[] = [
  {
    name: '免費',
    price: 'NT$0',
    period: '永久',
    tagline: '大部分功能免費，僅少量不干擾的廣告',
    features: ['30 秒個人化陪伴方案', '完整親子活動庫', '發展里程碑與能力追蹤'],
  },
  {
    name: '支持者',
    price: 'NT$90',
    period: '/月',
    tagline: '移除廣告、解鎖便利，一起支持開發',
    features: ['移除廣告', '家庭成員共享', '完整活動歷史'],
  },
  {
    name: 'Plus',
    price: 'NT$170',
    period: '/月',
    tagline: '進階陪伴，AI 為你客製',
    highlight: true,
    features: ['AI 客製化活動生成', '每月 100 次 AI 生成', '交接摘要'],
  },
]

/** 行動端方案頁：展示方案；App 內購（RevenueCat）尚未串接，誠實標「即將推出」。 */
export default function PricingScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            方案與支持
          </Text>
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>
        <Text className="mb-5 text-sm" style={{ color: colors.muted }}>
          大部分功能免費；付費可移除廣告並解鎖進階。
        </Text>

        <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: colors.infoTint }}>
          <Text className="text-sm" style={{ color: colors.info }}>
            App 內訂閱即將推出。目前可先在網頁版訂閱，方案會同步到這裡。
          </Text>
        </View>

        {PLANS.map((plan) => (
          <View
            key={plan.name}
            className="mb-4 rounded-2xl p-6"
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: plan.highlight ? colors.brand : colors.border,
              ...clayCard,
            }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {plan.name}
            </Text>
            <Text className="mb-2 text-sm" style={{ color: colors.muted }}>
              {plan.tagline}
            </Text>
            <View className="mb-4 flex-row items-baseline gap-1">
              <Text className="text-3xl font-bold" style={{ color: colors.brand }}>
                {plan.price}
              </Text>
              <Text style={{ color: colors.muted }}>{plan.period}</Text>
            </View>
            <View className="gap-2">
              {plan.features.map((f) => (
                <Text key={f} className="text-sm" style={{ color: colors.text }}>
                  ✓ {f}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
