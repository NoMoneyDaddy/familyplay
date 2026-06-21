import { type ChildSummary, fetchChildren } from '@familyplay/data'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { stageLabel } from '@/lib/stage-labels'
import { useActiveChildStore } from '@/lib/stores/useActiveChild'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

// 孩子管理：列出全部孩子、標示目前選定者、點選即切換（持久化）並回 /now；可新增孩子。
// 直接接共用 packages/data（fetchChildren，RLS 由帶 session 的 mobile client 生效）。
export default function ChildrenScreen() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useAuthStore()
  const { activeChildId, setActiveChild, hydrate, hydrated } = useActiveChildStore()

  const [children, setChildren] = useState<ChildSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // 未登入 → 登入頁
  useEffect(() => {
    if (!authLoading && !session) router.replace('/auth/login')
  }, [authLoading, session, router])

  // 還原上次選定的孩子（只做一次）
  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchChildren(createMobileClient())
      if (!isMounted.current) return
      setChildren(list)
    } catch {
      if (isMounted.current) setError('載入孩子資料失敗，請稍後再試')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) load()
  }, [session, load])

  const pick = (id: string) => {
    setActiveChild(id)
    router.replace('/now')
  }

  if (authLoading || (loading && !children)) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    )
  }

  // 目前選定者：以 store 為準，沒有就視第一個為預設（與 /now 的解析一致）。
  const selectedId = activeChildId ?? children?.[0]?.id ?? null

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            孩子
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

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {children && children.length > 0 ? (
          <View className="mb-5 gap-3">
            {children.map((child) => {
              const selected = child.id === selectedId
              return (
                <Pressable
                  key={child.id}
                  onPress={() => pick(child.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`選擇 ${child.nickname ?? '孩子'}`}
                  className="flex-row items-center justify-between rounded-2xl p-5 active:opacity-90"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: selected ? colors.brand : colors.border,
                    ...clayCard,
                  }}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-bold" style={{ color: colors.text }}>
                      {child.nickname ?? '孩子'}
                    </Text>
                    {stageLabel(child.stageKey) ? (
                      <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
                        {stageLabel(child.stageKey)}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.brandTint }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: colors.brandStrong }}>
                        目前
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-base" style={{ color: colors.muted }}>
                      ›
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        ) : (
          <View className="mb-5 rounded-2xl p-5" style={{ backgroundColor: colors.brandTint }}>
            <Text className="text-sm" style={{ color: colors.text }}>
              還沒有孩子。新增一個，就能開始拿到專屬的陪伴方案。
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => router.push('/onboarding/child-info')}
          accessibilityRole="button"
          accessibilityLabel="新增孩子"
          className="items-center rounded-2xl py-4 active:opacity-90"
          style={{ backgroundColor: colors.brand }}
        >
          <Text className="text-base font-bold text-white">＋ 新增孩子</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
