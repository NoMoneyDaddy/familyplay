import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchHistory, type HistoryEntry } from '@/lib/history'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

const REACTION_LABELS: Record<string, string> = {
  happy: '😊 開心',
  engaged: '🙂 投入',
  neutral: '😐 普通',
  leaving: '😣 想離開',
  disinterested: '😕 興趣缺缺',
  calmed: '😌 平靜',
}
const OUTCOME_LABELS: Record<string, string> = {
  completed: '完成',
  tried: '試了',
  abandoned: '中斷',
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

/** 行動端陪伴歷史：完成「推薦 → 做了 → 記錄 → 回顧」可視閉環。 */
export default function HistoryScreen() {
  const router = useRouter()
  const { childId } = useLocalSearchParams<{ childId: string }>()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchHistory(createMobileClient(), childId)
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch(() => {
        if (!cancelled) setError('無法載入陪伴紀錄')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [childId])

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
            陪伴紀錄
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

        {!error && entries.length === 0 ? (
          <View className="items-center rounded-2xl p-8" style={{ backgroundColor: colors.card }}>
            <Text className="text-center text-base" style={{ color: colors.muted }}>
              還沒有陪伴紀錄。{'\n'}做完一個活動後點「做了這個」就會出現在這。
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          {entries.map((e) => (
            <View
              key={e.id}
              className="rounded-2xl p-5"
              style={{ backgroundColor: colors.card, ...clayCard }}
            >
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="flex-1 text-base font-bold" style={{ color: colors.text }}>
                  {e.title}
                </Text>
                <Text className="ml-2 text-xs" style={{ color: colors.muted }}>
                  {formatDate(e.createdAt)}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {e.reaction && REACTION_LABELS[e.reaction] ? (
                  <Text className="text-sm" style={{ color: colors.muted }}>
                    {REACTION_LABELS[e.reaction]}
                  </Text>
                ) : null}
                {e.outcome && OUTCOME_LABELS[e.outcome] ? (
                  <Text className="text-sm" style={{ color: colors.muted }}>
                    · {OUTCOME_LABELS[e.outcome]}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
