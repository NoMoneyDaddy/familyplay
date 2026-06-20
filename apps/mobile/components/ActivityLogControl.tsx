import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { type ChildReaction, LogError, logCompanion } from '@/lib/log'
import { createMobileClient } from '@/lib/supabase/mobile'
import { colors } from '@/lib/theme'

const REACTIONS: { value: ChildReaction; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: '開心' },
  { value: 'engaged', emoji: '🙂', label: '投入' },
  { value: 'neutral', emoji: '😐', label: '普通' },
  { value: 'leaving', emoji: '😣', label: '想離開' },
  { value: 'calmed', emoji: '😌', label: '平靜' },
]

type State = 'idle' | 'choosing' | 'saving' | 'done'

/**
 * 推薦卡上的「做了這個」記錄控制：點開 → 選孩子反應 → 寫一筆 companion_logs。
 * outcome 固定 completed（主流程是「做完了，反應如何」）；閉環餵歷史降權＋歷史頁。
 */
export function ActivityLogControl({
  childId,
  activityId,
}: {
  childId: string
  activityId: string
}) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')

  const save = async (reaction: ChildReaction) => {
    setState('saving')
    setError('')
    try {
      const supabase = createMobileClient()
      await logCompanion(supabase, {
        childId,
        activityId,
        outcome: 'completed',
        childReaction: reaction,
      })
      setState('done')
    } catch (err) {
      setError(err instanceof LogError ? err.message : '記錄失敗，請稍後再試')
      setState('choosing')
    }
  }

  if (state === 'done') {
    return (
      <View className="mt-3 flex-row items-center gap-2">
        <Text className="text-sm font-semibold" style={{ color: colors.success }}>
          已記錄 ✓
        </Text>
      </View>
    )
  }

  if (state === 'idle') {
    return (
      <Pressable
        onPress={() => setState('choosing')}
        accessibilityRole="button"
        accessibilityLabel="記錄做了這個活動"
        className="mt-3 self-start rounded-full px-4 py-2 active:opacity-80"
        style={{ backgroundColor: colors.brandTint }}
      >
        <Text className="text-sm font-semibold" style={{ color: colors.brandStrong }}>
          做了這個 ✓
        </Text>
      </Pressable>
    )
  }

  // choosing | saving
  return (
    <View className="mt-3">
      <Text className="mb-2 text-sm" style={{ color: colors.muted }}>
        孩子的反應？
      </Text>
      {state === 'saving' ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {REACTIONS.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => save(r.value)}
              accessibilityRole="button"
              accessibilityLabel={`反應：${r.label}`}
              className="items-center rounded-xl px-3 py-2 active:opacity-80"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-lg">{r.emoji}</Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {error ? (
        <Text className="mt-2 text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}
