import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import type { PurchasesPackage } from 'react-native-purchases'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  getPlanPackages,
  identifyPurchaser,
  isPurchasesAvailable,
  PurchaseError,
  purchase,
} from '@/lib/purchases'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

interface Plan {
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  highlight?: boolean
}

// 靜態方案（RevenueCat 未設定時的展示後備）。價格以 store 實際定價為準。
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

/** 行動端方案頁：RevenueCat 已設定 → 顯示 App 內購方案並可購買；否則顯示靜態後備。 */
export default function PricingScreen() {
  const router = useRouter()
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null)
  const [loading, setLoading] = useState(isPurchasesAvailable())
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [purchased, setPurchased] = useState(false)

  useEffect(() => {
    if (!isPurchasesAvailable()) return
    let cancelled = false
    getPlanPackages()
      .then((pkgs) => {
        if (!cancelled) setPackages(pkgs)
      })
      .catch(() => {
        if (!cancelled) setPackages([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleBuy = async (pkg: PurchasesPackage) => {
    if (purchasingId) return
    setPurchasingId(pkg.identifier)
    setError('')
    try {
      // appUserID 必須等於 user_profiles.id，webhook 才能正確對應權益。
      const supabase = createMobileClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (!profile) throw new PurchaseError('找不到帳號資料')

      await identifyPurchaser(profile.id)
      const ok = await purchase(pkg)
      if (ok) setPurchased(true)
    } catch (err) {
      setError(err instanceof PurchaseError ? err.message : '購買失敗，請稍後再試')
    } finally {
      setPurchasingId(null)
    }
  }

  const showStorePackages = isPurchasesAvailable() && packages && packages.length > 0

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

        {purchased ? (
          <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: colors.successTint }}>
            <Text className="text-sm font-semibold" style={{ color: colors.success }}>
              訂閱成功 ✓ 方案同步中，稍候即會更新。
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : showStorePackages ? (
          // ── RevenueCat App 內購方案 ──
          packages?.map((pkg) => (
            <View
              key={pkg.identifier}
              className="mb-4 rounded-2xl p-6"
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.brand,
                ...clayCard,
              }}
            >
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                {pkg.product.title}
              </Text>
              {pkg.product.description ? (
                <Text className="mb-2 text-sm" style={{ color: colors.muted }}>
                  {pkg.product.description}
                </Text>
              ) : null}
              <Text className="mb-4 text-3xl font-bold" style={{ color: colors.brand }}>
                {pkg.product.priceString}
              </Text>
              <Pressable
                onPress={() => handleBuy(pkg)}
                disabled={purchasingId !== null}
                accessibilityRole="button"
                className="items-center rounded-2xl py-4 active:opacity-90"
                style={{ backgroundColor: colors.brand, opacity: purchasingId ? 0.6 : 1 }}
              >
                {purchasingId === pkg.identifier ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-bold text-white">訂閱</Text>
                )}
              </Pressable>
            </View>
          ))
        ) : (
          // ── 後備：RevenueCat 未設定時的靜態展示 ──
          <>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
