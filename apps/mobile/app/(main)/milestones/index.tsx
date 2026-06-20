import {
  type AssessmentDomain,
  getZpdTargets,
  MILESTONE_MAP,
  MILESTONES,
} from '@familyplay/assessment'
import { ALLOWED_CAPABILITY_KEYS, type CapabilityKey } from '@familyplay/core'
import {
  type AchievedMap,
  CapabilityError,
  fetchAchievedCapabilities,
  setChildCapability,
} from '@familyplay/data'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

// 領域顯示順序與標籤（與 Web 一致：粗大→精細→語言→社交→情緒）
const DOMAIN_ORDER: AssessmentDomain[] = [
  'gross_motor',
  'fine_motor',
  'language',
  'social_cognitive',
  'emotional',
]
const DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  gross_motor: '粗大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}

const MILESTONES_BY_DOMAIN = DOMAIN_ORDER.map((domain) => ({
  domain,
  label: DOMAIN_LABELS[domain],
  items: MILESTONES.filter((m) => m.domain === domain),
}))
const TOTAL = MILESTONES.length

/** 行動端發展里程碑：分域標記「會了/還沒」（樂觀更新、逐顆 pending），驅動 ZPD 推薦。 */
export default function MilestonesScreen() {
  const router = useRouter()
  const { childId } = useLocalSearchParams<{ childId: string }>()

  const [achieved, setAchieved] = useState<AchievedMap>({})
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchAchievedCapabilities(createMobileClient(), childId)
      .then((map) => {
        if (!cancelled) setAchieved(map)
      })
      .catch(() => {
        if (!cancelled) setAchieved({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [childId])

  const achievedCount = Object.values(achieved).filter(Boolean).length

  // 「下一步」ZPD 建議：依已會的里程碑推出正在發展中的下一顆
  const nextItems = useMemo(() => {
    const achievedKeys = ALLOWED_CAPABILITY_KEYS.filter((k) => achieved[k] === true)
    return getZpdTargets(achievedKeys)
      .map((k) => MILESTONE_MAP.get(k))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [achieved])

  const toggle = async (key: CapabilityKey) => {
    if (!childId || pending.has(key)) return
    const next = !achieved[key]
    setError('')
    // 樂觀更新
    setAchieved((prev) => {
      const copy = { ...prev }
      if (next) copy[key] = true
      else delete copy[key]
      return copy
    })
    setPending((prev) => new Set(prev).add(key))
    try {
      await setChildCapability(createMobileClient(), childId, key, next)
    } catch (err) {
      // 失敗回復
      setAchieved((prev) => {
        const copy = { ...prev }
        if (next) delete copy[key]
        else copy[key] = true
        return copy
      })
      setError(err instanceof CapabilityError ? err.message : '儲存失敗，請稍後再試')
    } finally {
      setPending((prev) => {
        const copy = new Set(prev)
        copy.delete(key)
        return copy
      })
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            發展里程碑
          </Text>
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>
        <Text className="mb-5 text-sm" style={{ color: colors.muted }}>
          標記孩子會了什麼，推薦會更貼近他的發展（已標記 {achievedCount}/{TOTAL}）
        </Text>

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* 下一步 ZPD 建議 */}
        {nextItems.length > 0 && (
          <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: colors.brandTint }}>
            <Text className="mb-1 text-sm font-bold" style={{ color: colors.brandStrong }}>
              接下來正在發展中
            </Text>
            <Text className="text-sm" style={{ color: colors.brandStrong }}>
              {nextItems.map((m) => m.label).join('、')}
            </Text>
          </View>
        )}

        {MILESTONES_BY_DOMAIN.map(({ domain, label, items }) => (
          <View key={domain} className="mb-6">
            <Text className="mb-3 text-base font-bold" style={{ color: colors.text }}>
              {label}
            </Text>
            <View className="gap-2">
              {items.map((m) => {
                const isOn = achieved[m.key] === true
                const isPending = pending.has(m.key)
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => toggle(m.key)}
                    disabled={isPending}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isOn, disabled: isPending }}
                    accessibilityLabel={`${m.label}，${m.typicalMonths}`}
                    className="flex-row items-center gap-3 rounded-2xl p-4 active:opacity-80"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: isOn ? colors.brand : colors.border,
                      ...clayCard,
                    }}
                  >
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isOn ? colors.brand : 'transparent',
                        borderWidth: isOn ? 0 : 2,
                        borderColor: colors.border,
                      }}
                    >
                      {isPending ? (
                        <ActivityIndicator size="small" color={isOn ? '#FFFFFF' : colors.brand} />
                      ) : isOn ? (
                        <Text className="text-sm font-bold text-white">✓</Text>
                      ) : null}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium" style={{ color: colors.text }}>
                        {m.label}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.muted }}>
                        通常 {m.typicalMonths}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
