import { CAPABILITY_LABELS } from '@familyplay/assessment'
import { type ActivityDetail, fetchActivity } from '@familyplay/data'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

const FOCUS_LABELS: Record<string, string> = {
  gross_motor: '粗大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}

/** 活動詳情（怎麼玩）：開場白、步驟、延伸問題、結尾、安全提醒、會練到什麼。 */
export default function ActivityDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setError('缺少活動 id')
      setLoading(false)
      return
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const a = await fetchActivity(createMobileClient(), { activityId: id })
        if (!cancelled) {
          if (a) setActivity(a)
          else setError('找不到這個活動')
        }
      } catch {
        if (!cancelled) setError('無法載入活動詳情')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [id])

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

  const skills = activity
    ? activity.zpdTargets.map((k) => CAPABILITY_LABELS[k]).filter(Boolean)
    : []

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="flex-1 text-2xl font-bold" style={{ color: colors.text }}>
            {activity?.title ?? '活動'}
          </Text>
          <Pressable onPress={() => router.back()} className="ml-2 active:opacity-70">
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View className="rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : activity ? (
          <View className="gap-5">
            {activity.openingLine ? (
              <View className="rounded-2xl p-5" style={{ backgroundColor: colors.brandTint }}>
                <Text className="text-lg font-semibold" style={{ color: colors.brandStrong }}>
                  {activity.openingLine}
                </Text>
                {activity.minDurationMinutes != null && activity.maxDurationMinutes != null ? (
                  <Text className="mt-2 text-xs" style={{ color: colors.brandStrong }}>
                    約 {activity.minDurationMinutes}–{activity.maxDurationMinutes} 分鐘
                  </Text>
                ) : null}
              </View>
            ) : null}

            {activity.steps.length > 0 ? (
              <View
                className="rounded-2xl p-5"
                style={{ backgroundColor: colors.card, ...clayCard }}
              >
                <Text className="mb-3 text-base font-bold" style={{ color: colors.text }}>
                  怎麼玩
                </Text>
                <View className="gap-3">
                  {activity.steps.map((step, i) => (
                    <View key={step} className="flex-row gap-3">
                      <Text className="text-base font-bold" style={{ color: colors.brand }}>
                        {i + 1}.
                      </Text>
                      <Text className="flex-1 text-base" style={{ color: colors.text }}>
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {activity.followUpQuestions.length > 0 ? (
              <View
                className="rounded-2xl p-5"
                style={{ backgroundColor: colors.card, ...clayCard }}
              >
                <Text className="mb-3 text-base font-bold" style={{ color: colors.text }}>
                  可以問問他
                </Text>
                <View className="gap-2">
                  {activity.followUpQuestions.map((q) => (
                    <Text key={q} className="text-base" style={{ color: colors.muted }}>
                      · {q}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {activity.endingLine ? (
              <Text className="text-center text-sm italic" style={{ color: colors.muted }}>
                {activity.endingLine}
              </Text>
            ) : null}

            {skills.length > 0 ? (
              <View>
                <Text className="mb-2 text-sm font-semibold" style={{ color: colors.muted }}>
                  會練到
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {activity.developmentalFocus.map((f) => (
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
                  {skills.map((s) => (
                    <View
                      key={s}
                      className="rounded-full px-2.5 py-1"
                      style={{ backgroundColor: colors.successTint }}
                    >
                      <Text className="text-xs font-medium" style={{ color: colors.success }}>
                        {s}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {activity.safetyNotes ? (
              <View className="rounded-2xl p-4" style={{ backgroundColor: colors.warningTint }}>
                <Text className="text-sm" style={{ color: colors.warning }}>
                  ⚠️ {activity.safetyNotes}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
