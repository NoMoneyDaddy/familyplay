import type { CompanionContext } from '@familyplay/core'
import {
  allRecommendationsSeen,
  type ChildSummary,
  fetchChildren,
  fetchRecommendations,
  type RecommendedActivity,
} from '@familyplay/data'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActivityLogControl } from '@/components/ActivityLogControl'
import { Mascot } from '@/components/Mascot'
import { type AiActivity, generateAiActivity } from '@/lib/ai-activity'
import { useAIKeyStore } from '@/lib/ai-key'
import { resolveActiveChild } from '@/lib/resolve-active-child'
import { useActiveChildStore } from '@/lib/stores/useActiveChild'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { createMobileClient } from '@/lib/supabase/mobile'
import { clayCard, colors } from '@/lib/theme'

// 一鍵「現在就陪」：不問年齡/精力/情境——用「目前選定的孩子」、依時段自動帶情境、精力預設「有點累」，
// 直接給「一個」主答案。想換按「換一個」，玩完一鍵記錄。與 Web /now 對齊，直接接 packages/data
// （RLS 由帶 session 的 mobile client 生效，無 Next API route）。
const DEFAULT_ENERGY = 'low' as const

// 依時段帶預設情境（與 Web timeDefaultContext 一致）：晚上→睡前，其餘→一般。
function timeContext(): CompanionContext {
  const h = new Date().getHours()
  return h >= 19 || h < 6 ? 'bedtime' : 'normal'
}

const FOCUS_LABELS: Record<string, string> = {
  gross_motor: '粗大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}
const STIM_LABELS: Record<string, string> = { low: '安靜', medium: '適中', high: '活潑' }

const REASON_FRIENDLY: Record<string, string> = {
  發展中能力加分: '正好練到他正在發展的能力',
  '孩子之前很喜歡，加分': '他之前玩這個玩得很開心',
}
function friendlyReasons(reasons: string[]): string[] {
  return Array.from(
    new Set(reasons.map((r) => REASON_FRIENDLY[r]).filter((r): r is string => Boolean(r))),
  )
}

// 引擎無匹配時會回「安全兜底」方案，其 id 非真實活動 UUID、不可記錄。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function NowScreen() {
  const router = useRouter()
  const { session, isLoading } = useAuthStore()
  const { activeChildId, setActiveChild, hydrate, hydrated } = useActiveChildStore()
  const { config: aiKey, hydrate: hydrateAi, hydrated: aiHydrated } = useAIKeyStore()

  const [childId, setChildId] = useState<string | null>(null)
  const [child, setChild] = useState<ChildSummary | null>(null)
  const [childName, setChildName] = useState<string | null>(null)
  const [childCount, setChildCount] = useState(0)
  // 「都玩過了」AI 客製活動（自帶金鑰）
  const [aiActivity, setAiActivity] = useState<AiActivity | null>(null)
  const [aiSkills, setAiSkills] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  // 已載入過的孩子 id：首次 null→解析後會 setActiveChild 再觸發本 effect，靠它短路避免重複打 API。
  const loadedChildIdRef = useRef<string | undefined>(undefined)
  const [rec, setRec] = useState<RecommendedActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [error, setError] = useState('')
  const seen = useRef<Set<string>>(new Set())
  // 卸載後不再 setState，避免非同步回來時對已卸載組件更新狀態的警告。
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // 未登入 → 登入頁
  useEffect(() => {
    if (!isLoading && !session) router.replace('/auth/login')
  }, [isLoading, session, router])

  // 還原上次選定的孩子（只做一次）。等還原完才決定用哪個孩子，避免先用第一個閃一下。
  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  // 還原自帶 AI 金鑰（決定「都玩過了」要顯示「請 AI 生一個」或「去設定」）
  useEffect(() => {
    if (!aiHydrated) hydrateAi()
  }, [aiHydrated, hydrateAi])

  const loadRec = useCallback(async (cid: string, excludeIds: string[], shuffle: boolean) => {
    if (shuffle) setShuffling(true)
    else setLoading(true)
    setError('')
    try {
      const supabase = createMobileClient()
      const result = await fetchRecommendations(supabase, {
        childId: cid,
        parentEnergy: DEFAULT_ENERGY,
        context: timeContext(),
        availableSpace: 'anywhere',
        excludeIds,
      })
      if (!isMounted.current) return
      if (shuffle && allRecommendationsSeen(result, excludeIds)) {
        setExhausted(true)
        return
      }
      const next = result[0]
      if (next) {
        seen.current.add(next.id)
        setRec(next)
        setExhausted(false)
      }
    } catch {
      if (isMounted.current) setError('系統忙線或網路不穩，請稍後再試。')
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setShuffling(false)
      }
    }
  }, [])

  // 初次：取孩子清單 → 用選定的孩子（沒有就第一個並記住）→ 載一個方案；沒孩子先去建立。
  // 等 store 還原完（hydrated）才解析，確保用的是上次記住的孩子而非總是第一個。
  useEffect(() => {
    if (!session || !hydrated) return
    // 已為目前選定孩子載過就不重複打 API（首次 null→解析後 setActiveChild 會再觸發本 effect）。
    if (loadedChildIdRef.current && loadedChildIdRef.current === activeChildId) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createMobileClient()
        const children = await fetchChildren(supabase)
        if (cancelled) return
        if (children.length === 0) {
          router.replace('/onboarding/child-info')
          return
        }
        // 選定者存在於清單就用它，否則退回第一個並持久化（修掉孩子被刪/換裝置的失效 id）。
        // children 已非空（上面擋掉 length===0），resolveActiveChild 必回非 null。
        const chosen = resolveActiveChild(children, activeChildId) as (typeof children)[number]
        loadedChildIdRef.current = chosen.id
        if (chosen.id !== activeChildId) setActiveChild(chosen.id)
        setChildId(chosen.id)
        setChild(chosen)
        setChildName(chosen.nickname)
        setChildCount(children.length)
        await loadRec(chosen.id, [], false)
      } catch {
        if (!cancelled) {
          setError('載入失敗，請稍後再試')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, hydrated, activeChildId, setActiveChild, router, loadRec])

  const shuffle = () => {
    if (childId) loadRec(childId, [...seen.current], true)
  }

  const generateAi = async () => {
    if (!child || !aiKey || aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      const result = await generateAiActivity(createMobileClient(), child, aiKey)
      if (!isMounted.current) return
      if (result.ok) {
        setAiActivity(result.activity)
        setAiSkills(result.targetedSkills)
      } else {
        setAiError(
          result.reason === 'no_model'
            ? '還差一步：請到「用你自己的 AI 帳號」填入模型名稱。'
            : '這次沒成功，可能是金鑰或網路問題，稍後再試。',
        )
      }
    } catch {
      if (isMounted.current) setAiError('這次沒成功，請稍後再試。')
    } finally {
      if (isMounted.current) setAiLoading(false)
    }
  }

  if (isLoading || (loading && !rec)) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <Text className="mb-3" style={{ color: colors.muted }}>
          幫你選一個現在就能玩的…
        </Text>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    )
  }

  const reasons = rec ? friendlyReasons(rec.reasons).slice(0, 2) : []
  const isReal = rec ? UUID_RE.test(rec.id) : false

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {/* 品牌 */}
        <View className="mb-3 flex-row items-center justify-center gap-2">
          <Mascot size={28} />
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            FamilyPlay
          </Text>
        </View>

        {/* 目前陪伴的孩子 + 切換/管理入口（多孩子家庭可切換；單一也能進去新增） */}
        {childName ? (
          <Pressable
            onPress={() => router.push('/children')}
            accessibilityRole="button"
            accessibilityLabel={`目前陪伴 ${childName}，點此切換或管理孩子`}
            className="mb-5 flex-row items-center justify-center gap-1 active:opacity-70"
          >
            <Text className="text-sm font-medium" style={{ color: colors.muted }}>
              陪伴中：{childName}
            </Text>
            <Text className="text-sm font-medium" style={{ color: colors.brand }}>
              {childCount > 1 ? '· 切換 ›' : '· 管理 ›'}
            </Text>
          </Pressable>
        ) : null}

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        {rec ? (
          <View style={clayCard} className="mb-5 p-5">
            <Text className="mb-3 text-xl font-bold" style={{ color: colors.text }}>
              {rec.title}
            </Text>

            <View className="mb-3 flex-row flex-wrap gap-2">
              {(rec.developmentalFocus ?? []).slice(0, 1).map((f) => (
                <View
                  key={f}
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: colors.brandTint }}
                >
                  <Text className="text-xs font-medium" style={{ color: colors.brandStrong }}>
                    {FOCUS_LABELS[f] ?? f}
                  </Text>
                </View>
              ))}
              {rec.minDurationMinutes != null && rec.maxDurationMinutes != null ? (
                <View
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text className="text-xs" style={{ color: colors.muted }}>
                    {rec.minDurationMinutes}–{rec.maxDurationMinutes} 分鐘
                  </Text>
                </View>
              ) : null}
              {rec.stimulationLevel ? (
                <View
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text className="text-xs" style={{ color: colors.muted }}>
                    {STIM_LABELS[rec.stimulationLevel] ?? rec.stimulationLevel}
                  </Text>
                </View>
              ) : null}
            </View>

            {reasons.map((r) => (
              <Text key={r} className="mb-1 text-xs" style={{ color: colors.muted }}>
                ✓ {r}
              </Text>
            ))}

            {/* 玩完一鍵記錄（兜底方案非真實活動、不可記錄） */}
            {isReal && childId ? (
              <View className="mt-4">
                <ActivityLogControl childId={childId} activityId={rec.id} />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 換一個 */}
        <Pressable
          onPress={shuffle}
          disabled={shuffling || exhausted}
          accessibilityRole="button"
          accessibilityLabel="換一個方案"
          className="mb-3 items-center rounded-2xl py-4 active:opacity-90"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: shuffling || exhausted ? 0.6 : 1,
          }}
        >
          {shuffling ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Text className="text-base font-semibold" style={{ color: colors.text }}>
              {exhausted ? '暫時沒有更多了' : '換一個'}
            </Text>
          )}
        </Pressable>

        {/* 都玩過了 → 用自己的 AI 帳號生一個全新的 */}
        {exhausted ? (
          <View style={clayCard} className="mb-3 p-5">
            <Text className="mb-1 text-base font-bold" style={{ color: colors.text }}>
              都玩過了？讓 AI 生一個
            </Text>
            <Text className="mb-3 text-sm" style={{ color: colors.muted }}>
              依孩子的程度，現場想一個全新的小活動（用你自己的 AI 帳號、免費）。
            </Text>

            {aiActivity ? (
              <View className="mb-3 rounded-xl p-4" style={{ backgroundColor: colors.brandTint }}>
                <Text className="mb-2 text-lg font-bold" style={{ color: colors.text }}>
                  {aiActivity.title}
                </Text>
                {aiActivity.openingLine ? (
                  <Text className="mb-2 text-sm italic" style={{ color: colors.brandStrong }}>
                    「{aiActivity.openingLine}」
                  </Text>
                ) : null}
                {aiActivity.steps.map((s, i) => (
                  // AI 步驟無穩定 id、順序固定不重排，用 index 當 key 安全
                  // biome-ignore lint/suspicious/noArrayIndexKey: 靜態清單、不重排
                  <Text key={i} className="mb-1 text-sm" style={{ color: colors.text }}>
                    {i + 1}. {s}
                  </Text>
                ))}
                {aiSkills.length > 0 ? (
                  <Text className="mt-2 text-xs" style={{ color: colors.muted }}>
                    會練到：{aiSkills.join('、')}
                  </Text>
                ) : null}
                <Text className="mt-2 text-xs" style={{ color: colors.faint }}>
                  這是 AI 即時想的，沒有人工檢查過，請依現場狀況注意安全。
                </Text>
              </View>
            ) : null}

            {aiError ? (
              <Text className="mb-2 text-sm" style={{ color: colors.danger }}>
                {aiError}
              </Text>
            ) : null}

            {aiKey ? (
              <Pressable
                onPress={generateAi}
                disabled={aiLoading}
                accessibilityRole="button"
                accessibilityLabel="請 AI 想一個新活動"
                className="items-center rounded-2xl py-3 active:opacity-90"
                style={{ backgroundColor: colors.brand, opacity: aiLoading ? 0.6 : 1 }}
              >
                {aiLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-bold text-white">
                    {aiActivity ? '再想一個' : '請 AI 想一個'}
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/ai-settings')}
                accessibilityRole="button"
                className="items-center rounded-2xl py-3 active:opacity-90"
                style={{ backgroundColor: colors.brand }}
              >
                <Text className="text-base font-bold text-white">用你自己的 AI 帳號</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* 想自己挑狀態 */}
        <Pressable
          onPress={() => router.push('/select')}
          accessibilityRole="button"
          className="items-center py-2 active:opacity-70"
        >
          <Text className="text-sm font-medium" style={{ color: colors.muted }}>
            想自己挑狀態
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
