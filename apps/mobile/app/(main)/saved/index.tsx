import { fetchSaved, type SavedEntry } from '@familyplay/data'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SaveButton } from '@/components/SaveButton'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

const FOCUS_LABELS: Record<string, string> = {
  gross_motor: '粗大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}
const STIM_LABELS: Record<string, string> = { low: '安靜', medium: '適中', high: '活潑' }

/** 我的收藏：之後想再找回喜歡的活動。收藏讀寫走 @familyplay/data（RLS 生效）。 */
export default function SavedScreen() {
  const router = useRouter()
  const [items, setItems] = useState<SavedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await fetchSaved(createMobileClient())
        if (!cancelled) setItems(rows)
      } catch {
        if (!cancelled) setError('無法載入收藏')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

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
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            我的收藏
          </Text>
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {!error && items.length === 0 ? (
          <View className="items-center rounded-2xl p-8" style={{ backgroundColor: colors.card }}>
            <Text className="text-center text-base" style={{ color: colors.muted }}>
              還沒有收藏。在推薦卡片點 ♡ 把喜歡的活動收起來，之後就能在這裡找到。
            </Text>
          </View>
        ) : null}

        {items.map((item) => (
          <View
            key={item.activityId}
            className="mb-4 rounded-2xl p-5"
            style={{ backgroundColor: colors.card, ...clayCard }}
          >
            <View className="mb-1 flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-xl font-bold" style={{ color: colors.text }}>
                {item.title}
              </Text>
              <SaveButton activityId={item.activityId} initialSaved />
            </View>
            {item.minDurationMinutes != null && item.maxDurationMinutes != null ? (
              <Text className="mb-2 text-sm" style={{ color: colors.muted }}>
                {item.minDurationMinutes}–{item.maxDurationMinutes} 分鐘
                {item.stimulationLevel
                  ? ` · ${STIM_LABELS[item.stimulationLevel] ?? item.stimulationLevel}`
                  : ''}
              </Text>
            ) : null}
            {item.developmentalFocus.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {item.developmentalFocus.map((f) => (
                  <View
                    key={f}
                    className="rounded-full px-2.5 py-1"
                    style={{ backgroundColor: colors.brandTint }}
                  >
                    <Text className="text-xs font-medium" style={{ color: colors.brandStrong }}>
                      {FOCUS_LABELS[f] ?? f}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={() => router.push(`/activity?id=${item.activityId}`)}
              accessibilityRole="button"
              accessibilityLabel={`看 ${item.title} 怎麼玩`}
              className="mt-3 flex-row items-center justify-between rounded-xl px-4 py-2.5 active:opacity-80"
              style={{ backgroundColor: colors.brandTint }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.brandStrong }}>
                看怎麼玩 · 步驟、可以問什麼
              </Text>
              <Text className="text-sm" style={{ color: colors.brandStrong }}>
                ›
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
