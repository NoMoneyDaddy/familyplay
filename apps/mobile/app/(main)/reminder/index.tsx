import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useReminderStore } from '@/lib/reminder'
import { formatHour } from '@/lib/reminder-pure'
import { clayCard, colors } from '@/lib/theme'

// 常見親子時段供快速選擇（早上、午睡後、傍晚、睡前）
const HOUR_CHOICES = [9, 15, 18, 20, 21]

export default function ReminderScreen() {
  const router = useRouter()
  const { enabled, hour, hydrated, busy, hydrate, enable, setHour, disable } = useReminderStore()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  const handleToggle = async (next: boolean) => {
    setError('')
    if (next) {
      const ok = await enable(hour)
      if (!ok) setError('沒辦法開啟提醒，請到手機設定允許「通知」後再試。')
    } else {
      await disable()
    }
  }

  const handlePickHour = async (h: number) => {
    setError('')
    const ok = await setHour(h)
    if (!ok) setError('沒辦法設定提醒，請到手機設定允許「通知」後再試。')
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            每日陪伴提醒
          </Text>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/now'))}
            accessibilityRole="button"
            accessibilityLabel="返回"
            className="active:opacity-70"
          >
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>
        <Text className="mb-5 text-sm leading-relaxed" style={{ color: colors.muted }}>
          每天固定時間，輕輕提醒你陪孩子玩一下。提醒只在這台手機，不會用到任何資料。
        </Text>

        <View
          className="mb-5 flex-row items-center justify-between rounded-2xl p-5"
          style={{ backgroundColor: colors.card, ...clayCard }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold" style={{ color: colors.text }}>
              開啟每日提醒
            </Text>
            {enabled ? (
              <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
                每天 {formatHour(hour)} 提醒你
              </Text>
            ) : null}
          </View>
          {busy ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ true: colors.brand, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {enabled ? (
          <>
            <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>
              提醒時間
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {HOUR_CHOICES.map((h) => {
                const active = h === hour
                return (
                  <Pressable
                    key={h}
                    onPress={() => handlePickHour(h)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className="rounded-full px-4 py-2 active:opacity-90"
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
                      {formatHour(h)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
