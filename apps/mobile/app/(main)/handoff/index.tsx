import { getZpdTargets, MILESTONE_MAP } from '@familyplay/assessment'
import { ALLOWED_CAPABILITY_KEYS, getAgeMonths, getStageKey } from '@familyplay/core'
import { fetchAchievedCapabilities, fetchHistory, type HistoryEntry } from '@familyplay/data'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

// 交接小卡（行動端）：把「孩子現在到哪了 + 最近陪了什麼 + 接下來在發展什麼」濃縮成一張
// 可分享的卡，給接手的家人 30 秒進入狀況。純唯讀、用既有資料層即時組，不寫 DB、不送 AI、
// 不含生日等敏感資料（暱稱由家長自填、屬可分享範圍）。

const STAGE_LABELS: Record<string, string> = {
  newborn: '新生兒 · 0–3 個月',
  early_infant: '翻身期 · 3–6 個月',
  sitting_baby: '坐立期 · 6–9 個月',
  crawler: '爬行期 · 9–12 個月',
  early_walker: '學步期 · 12–18 個月',
  toddler_talker: '學語期 · 18–24 個月',
  toddler_player: '探索期 · 24–36 個月',
  preschooler: '學齡前 · 36–48 個月',
  preschooler_plus: '學齡前 · 48–60 個月',
}

const OUTCOME_LABEL: Record<string, string> = {
  completed: '完成',
  tried: '有嘗試',
  abandoned: '中途結束',
}

const RECENT_COUNT = 3

function stageLabelFromBirth(birth: string | null | undefined): string | null {
  if (!birth || !/^\d{4}-\d{2}$/.test(birth)) return null
  try {
    return STAGE_LABELS[getStageKey(getAgeMonths(birth))] ?? null
  } catch {
    return null
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-TW')
}

export default function HandoffScreen() {
  const router = useRouter()
  const { childId } = useLocalSearchParams<{ childId: string }>()
  const [nickname, setNickname] = useState('寶寶')
  const [stage, setStage] = useState<string | null>(null)
  const [recent, setRecent] = useState<HistoryEntry[]>([])
  const [achieved, setAchieved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  // reloadTick 不在 effect 內被讀取，但作為「重試」觸發器需列入依賴
  // biome-ignore lint/correctness/useExhaustiveDependencies: 刻意用 reloadTick 觸發重抓
  useEffect(() => {
    if (!childId) {
      setLoading(false)
      setError(true)
      return
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(false)
      try {
        const supabase = createMobileClient()
        // 任一來源失敗即整體標記錯誤、顯示重試：避免把載入失敗渲染成空小卡、甚至被分享成不完整快照。
        const [childRes, logs, caps] = await Promise.all([
          supabase
            .from('child_profiles')
            .select('nickname,birth_year_month')
            .eq('id', childId)
            .maybeSingle(),
          fetchHistory(supabase, childId),
          fetchAchievedCapabilities(supabase, childId),
        ])
        if (childRes.error) throw childRes.error
        if (cancelled) return
        const child = childRes.data as { nickname?: string; birth_year_month?: string } | null
        setNickname(child?.nickname || '寶寶')
        setStage(stageLabelFromBirth(child?.birth_year_month))
        setRecent(logs.slice(0, RECENT_COUNT))
        setAchieved(caps as Record<string, boolean>)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [childId, reloadTick])

  const nextItems = useMemo(() => {
    const achievedKeys = ALLOWED_CAPABILITY_KEYS.filter((k) => achieved[k] === true)
    return getZpdTargets(achievedKeys)
      .map((k) => MILESTONE_MAP.get(k))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [achieved])

  const buildText = () => {
    const lines = [`${nickname}的陪伴交接小卡`, '']
    if (stage) lines.push(`📍 現在階段：${stage}`, '')
    if (recent.length > 0) {
      lines.push('🧸 最近陪玩：')
      for (const l of recent) {
        const date = formatDate(l.createdAt)
        const outcome = l.outcome ? (OUTCOME_LABEL[l.outcome] ?? l.outcome) : ''
        lines.push(`· ${l.title}${outcome ? `（${outcome}${date ? `，${date}` : ''}）` : ''}`)
      }
      lines.push('')
    }
    if (nextItems.length > 0) {
      lines.push(`🌱 接下來在發展：${nextItems.map((m) => m.label).join('、')}`, '')
    }
    lines.push('💛 by FamilyPlay')
    return lines.join('\n')
  }

  const handleShare = async () => {
    try {
      await Share.share({ message: buildText() })
    } catch {
      // 使用者取消或系統不支援：尊重其選擇，不額外處理。
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
            交接小卡
          </Text>
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>
        <Text className="mb-6 text-sm" style={{ color: colors.muted }}>
          一眼看懂孩子現在的狀態，分享給接手的家人
        </Text>

        {error ? (
          <View className="items-center rounded-2xl p-8" style={{ backgroundColor: colors.card }}>
            <Text className="mb-4 text-center text-base" style={{ color: colors.muted }}>
              沒辦法整理出小卡，請檢查網路後再試一次。
            </Text>
            <Pressable
              onPress={() => setReloadTick((n) => n + 1)}
              accessibilityRole="button"
              className="rounded-xl px-5 py-2.5 active:opacity-80"
              style={{ backgroundColor: colors.brand }}
            >
              <Text className="font-semibold text-white">重試</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              className="gap-5 rounded-2xl p-5"
              style={{ backgroundColor: colors.card, ...clayCard }}
            >
              <Text className="text-lg font-bold" style={{ color: colors.text }}>
                {nickname}的小卡
              </Text>

              {stage ? (
                <View>
                  <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
                    現在階段
                  </Text>
                  <Text className="mt-0.5 text-sm" style={{ color: colors.text }}>
                    {stage}
                  </Text>
                </View>
              ) : null}

              <View>
                <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
                  最近陪玩
                </Text>
                {recent.length === 0 ? (
                  <Text className="mt-0.5 text-sm" style={{ color: colors.muted }}>
                    還沒有紀錄
                  </Text>
                ) : (
                  <View className="mt-1 gap-1">
                    {recent.map((l) => (
                      <Text key={l.id} className="text-sm" style={{ color: colors.text }}>
                        {l.title}
                        {l.outcome ? (
                          <Text style={{ color: colors.muted }}>
                            （{OUTCOME_LABEL[l.outcome] ?? l.outcome}）
                          </Text>
                        ) : null}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {nextItems.length > 0 ? (
                <View>
                  <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
                    接下來在發展
                  </Text>
                  <Text className="mt-0.5 text-sm" style={{ color: colors.text }}>
                    {nextItems.map((m) => m.label).join('、')}
                  </Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="分享給家人"
              className="mt-6 items-center rounded-2xl py-4 active:opacity-90"
              style={{ backgroundColor: colors.brand }}
            >
              <Text className="text-lg font-bold text-white">分享給家人</Text>
            </Pressable>

            <Text className="mt-3 text-center text-xs" style={{ color: colors.muted }}>
              內容即時整理，不含生日等敏感資料；只在你按分享時才送出。
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
