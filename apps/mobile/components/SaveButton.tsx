import { SavedError, saveActivity, unsaveActivity } from '@familyplay/data'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import { createMobileClient } from '@/lib/supabase/mobile'
import { colors } from '@/lib/theme'

/** 收藏切換（♥/♡）。樂觀更新，失敗回復。實際讀寫走 @familyplay/data（RLS 生效）。 */
export function SaveButton({
  activityId,
  initialSaved,
}: {
  activityId: string
  initialSaved: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    if (busy) return
    const next = !saved
    setSaved(next) // 樂觀更新
    setBusy(true)
    try {
      const supabase = createMobileClient()
      if (next) await saveActivity(supabase, { activityId })
      else await unsaveActivity(supabase, { activityId })
    } catch (err) {
      setSaved(!next) // 失敗回復
      if (!(err instanceof SavedError)) console.error('Save toggle error:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? '取消收藏' : '收藏'}
      hitSlop={8}
      className="active:opacity-70"
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : (
        <Text style={{ fontSize: 22, color: saved ? colors.brand : colors.faint }}>
          {saved ? '♥' : '♡'}
        </Text>
      )}
    </Pressable>
  )
}
