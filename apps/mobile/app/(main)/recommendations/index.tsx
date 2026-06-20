import type { CompanionContext, ParentEnergy } from '@familyplay/core'
import {
  fetchRecommendations,
  fetchSavedIds,
  RecommendError,
  type RecommendedActivity,
} from '@familyplay/data'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActivityLogControl } from '@/components/ActivityLogControl'
import { SaveButton } from '@/components/SaveButton'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

const ENERGY_OPTIONS: { value: ParentEnergy; label: string }[] = [
  { value: 'exhausted', label: '累垮了' },
  { value: 'low', label: '有點累' },
  { value: 'medium', label: '還行' },
  { value: 'high', label: '精神好' },
]

const CONTEXT_OPTIONS: { value: CompanionContext; label: string }[] = [
  { value: 'normal', label: '一般' },
  { value: 'bedtime', label: '睡前' },
  { value: 'emotional_crisis', label: '情緒崩潰' },
  { value: 'sick_day', label: '生病日' },
]

// 發展領域 key → 中文標籤（與 Web 一致）
const FOCUS_LABELS: Record<string, string> = {
  gross_motor: '粗大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}

const STIM_LABELS: Record<string, string> = { low: '低刺激', medium: '中刺激', high: '高刺激' }

// 引擎內部評分 reason 對家長沒意義，白名單轉白話、其餘（優先度調整/降分等）丟掉（與 Web 一致）。
const REASON_FRIENDLY: Record<string, string> = {
  發展中能力加分: '正好練到他正在發展的能力',
  '孩子之前很喜歡，加分': '他之前玩這個玩得很開心',
}
function friendlyReasons(reasons: string[]): string[] {
  return Array.from(
    new Set(reasons.map((r) => REASON_FRIENDLY[r]).filter((r): r is string => Boolean(r))),
  )
}

/** 與 Web /now 對齊的行動端推薦流程：選狀態 → 30 秒拿到方案 → 可換一批。 */
export default function RecommendationsScreen() {
  const router = useRouter()
  const { childId } = useLocalSearchParams<{ childId: string }>()

  const [energy, setEnergy] = useState<ParentEnergy>('low')
  const [context, setContext] = useState<CompanionContext>('normal')
  const [recs, setRecs] = useState<RecommendedActivity[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 「換一批」累積排除已看過的活動 id
  const [seenIds, setSeenIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const load = async (excludeIds: string[]) => {
    if (!childId) {
      setError('缺少孩子資料')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createMobileClient()
      const result = await fetchRecommendations(supabase, {
        childId,
        parentEnergy: energy,
        context,
        availableSpace: 'anywhere',
        excludeIds,
      })
      setRecs(result)
      setSeenIds((prev) => [...new Set([...prev, ...result.map((r) => r.id)])])
      // 收藏狀態（次要，失敗不影響推薦）
      fetchSavedIds(supabase)
        .then(setSavedIds)
        .catch(() => {})
    } catch (err) {
      setError(err instanceof RecommendError ? err.message : '載入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            現在就陪
          </Text>
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>

        {/* 里程碑＋歷史入口 */}
        {childId ? (
          <View className="mb-5 gap-2">
            <Pressable
              onPress={() => router.push(`/milestones?childId=${childId}`)}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-80"
              style={{ backgroundColor: colors.brandTint }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.brandStrong }}>
                📊 標記發展里程碑，讓推薦更準
              </Text>
              <Text className="text-sm" style={{ color: colors.brandStrong }}>
                ›
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/history?childId=${childId}`)}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-80"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.text }}>
                🕑 看陪伴紀錄
              </Text>
              <Text className="text-sm" style={{ color: colors.muted }}>
                ›
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/saved')}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-80"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.text }}>
                ♥ 我的收藏
              </Text>
              <Text className="text-sm" style={{ color: colors.muted }}>
                ›
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* 家長狀態 */}
        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.muted }}>
          你現在的狀態
        </Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {ENERGY_OPTIONS.map((opt) => {
            const active = energy === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => setEnergy(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="rounded-full px-4 py-2 active:opacity-80"
                style={{
                  backgroundColor: active ? colors.brand : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.brand : colors.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: active ? '#FFFFFF' : colors.text }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* 情境 */}
        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.muted }}>
          現在的情境
        </Text>
        <View className="mb-6 flex-row flex-wrap gap-2">
          {CONTEXT_OPTIONS.map((opt) => {
            const active = context === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => setContext(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="rounded-full px-4 py-2 active:opacity-80"
                style={{
                  backgroundColor: active ? colors.brand : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.brand : colors.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: active ? '#FFFFFF' : colors.text }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Pressable
          onPress={() => {
            setSeenIds([])
            load([])
          }}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="給我一個陪伴方案"
          className="mb-6 items-center rounded-2xl py-4 active:opacity-90"
          style={{ backgroundColor: colors.brand, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-lg font-bold text-white">🧡 給我一個方案</Text>
          )}
        </Pressable>

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {recs?.map((rec) => (
          <View
            key={rec.id}
            className="mb-4 rounded-2xl p-5"
            style={{ backgroundColor: colors.card, ...clayCard }}
          >
            <View className="mb-1 flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-xl font-bold" style={{ color: colors.text }}>
                {rec.title}
              </Text>
              <SaveButton activityId={rec.id} initialSaved={savedIds.has(rec.id)} />
            </View>
            <Text className="mb-3 text-sm" style={{ color: colors.muted }}>
              {rec.minDurationMinutes}–{rec.maxDurationMinutes} 分鐘 ·{' '}
              {STIM_LABELS[rec.stimulationLevel] ?? rec.stimulationLevel}
            </Text>

            {rec.developmentalFocus.length > 0 && (
              <View className="mb-3 flex-row flex-wrap gap-2">
                {rec.developmentalFocus.map((f) => (
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
            )}

            {friendlyReasons(rec.reasons).length > 0 && (
              <View className="gap-1">
                {friendlyReasons(rec.reasons).map((reason) => (
                  <Text key={reason} className="text-sm" style={{ color: colors.muted }}>
                    · {reason}
                  </Text>
                ))}
              </View>
            )}

            <Pressable
              onPress={() => router.push(`/activity?id=${rec.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`看 ${rec.title} 怎麼玩`}
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

            {childId ? <ActivityLogControl childId={childId} activityId={rec.id} /> : null}
          </View>
        ))}

        {recs && recs.length > 0 && (
          <Pressable
            onPress={() => load(seenIds)}
            disabled={loading}
            accessibilityRole="button"
            className="mt-2 items-center rounded-2xl py-3 active:opacity-80"
            style={{ borderWidth: 1, borderColor: colors.border, opacity: loading ? 0.6 : 1 }}
          >
            <Text className="font-semibold" style={{ color: colors.text }}>
              換一批
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
