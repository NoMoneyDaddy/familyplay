'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AIGenerateCard } from '@/app/components/ai-generate-card'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { FirstRunHint } from '@/app/components/first-run-hint'
import { FocusBadge } from '@/app/components/focus-illustration'
import { Mascot } from '@/app/components/mascot'
import { SaveHeart } from '@/app/components/save-heart'
import {
  ActivityMeta,
  Button,
  Card,
  friendlyReasons,
  Icon,
  type IconName,
  LinkButton,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import {
  isRealActivity,
  type Recommendation,
  readCachedRec,
  saveCachedRec,
  timeDefaultContext,
} from '@/lib/recommendation'
import { useChildStore } from '@/lib/stores/useChildStore'

// 一鍵「現在就陪」：不問年齡、不問精力、不問情境——用上次的孩子、依時段自動帶情境、
// 精力預設「有點累」，直接給「一個」主答案。想換就按「換一個」，玩完就一鍵記錄。
// 預設精力刻意取偏低：疲憊家長是常態，給低負擔方案最安全；想精挑可走「自己挑狀態」。
const DEFAULT_ENERGY = 'low'

// 依時段的擬人問候：先安撫疲憊家長的情緒，再給玩法（與 timeDefaultContext 的睡前判斷對齊）。
// 只在主答案卡（rec 分支、已水合後）渲染，無 SSR/hydration 不一致疑慮。
function nowGreeting(): { title: string; subtitle: string; icon: IconName } {
  const h = new Date().getHours()
  if (h >= 19 || h < 5)
    return { title: '睡前時光', subtitle: '忙了一天辛苦了，來個 5 分鐘的小靜玩', icon: 'moon' }
  if (h < 11) return { title: '早安', subtitle: '新的一天，陪他玩一下下吧', icon: 'today' }
  if (h < 14) return { title: '午安', subtitle: '吃飽了，來點輕鬆的親子時間', icon: 'today' }
  if (h < 18) return { title: '午後時光', subtitle: '空檔陪他玩，幫你選好了', icon: 'today' }
  return { title: '傍晚了', subtitle: '辛苦了，陪他放鬆一下吧', icon: 'today' }
}

export default function NowPage() {
  const router = useRouter()
  const selectedChildId = useChildStore((s) => s.selectedChildId)
  const hasHydrated = useChildStore((s) => s.hasHydrated)

  const [rec, setRec] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState<null | 'completed' | 'tried'>(null)
  // 記錄後的連續陪伴天數，用於結束畫面的火苗回饋（習慣養成的成就感）；抓不到就不顯示
  const [streak, setStreak] = useState<number | null>(null)
  // 本週累計陪伴次數，給結束畫面「你做得很好」的正向回饋；抓不到就不顯示
  const [weeklySessions, setWeeklySessions] = useState<number | null>(null)
  const [exhausted, setExhausted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false) // 離線/失敗時顯示的是上次快取的方案
  const seenIds = useRef<Set<string>>(new Set())

  // 沒孩子就先去引導建立（等 store 水合完才判斷，避免誤跳）
  useEffect(() => {
    if (hasHydrated && !selectedChildId) router.push('/onboarding')
  }, [hasHydrated, selectedChildId, router])

  const load = useCallback(
    async (excludeIds: string[], mode: 'initial' | 'shuffle') => {
      if (!selectedChildId) return
      if (mode === 'shuffle') setShuffling(true)
      else setLoading(true)
      setError(null)
      try {
        const res = await fetchWithTimeout('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: selectedChildId,
            parentEnergy: DEFAULT_ENERGY,
            context: timeDefaultContext(),
            availableSpace: 'anywhere',
            availableResources: [],
            maxDurationMinutes: 20,
            excludeIds,
          }),
        })
        const data = await res.json()
        if (data.error) {
          if (mode === 'initial') setError(data.error)
          return
        }
        const next: Recommendation | undefined = (data.recommendations || [])[0]
        if (!next || (mode === 'shuffle' && seenIds.current.has(next.id))) {
          setExhausted(true)
          return
        }
        seenIds.current.add(next.id)
        setRec(next)
        setStale(false)
        saveCachedRec(selectedChildId, next) // 成功就更新離線快取
      } catch (err) {
        console.error('Failed to fetch recommendation:', err)
        // 初次載入失敗（多半是離線/掛起）：有上次快取就回放，標記為「離線顯示」，
        // 別讓疲憊家長只看到錯誤；換一個失敗則維持原畫面。
        if (mode === 'initial') {
          const cached = readCachedRec(selectedChildId)
          if (cached) {
            setRec(cached)
            setStale(true)
          } else {
            setError('系統忙線或網路不穩，請稍後再試。')
          }
        }
      } finally {
        setLoading(false)
        setShuffling(false)
      }
    },
    [selectedChildId],
  )

  // 孩子就緒就自動載入第一個答案
  useEffect(() => {
    if (!selectedChildId) return
    seenIds.current = new Set()
    setExhausted(false)
    setLogged(null)
    load([], 'initial')
  }, [selectedChildId, load])

  const handleShuffle = () => load([...seenIds.current], 'shuffle')

  // 一鍵記錄：做完了→completed/happy；沒成功→tried/neutral。不再問反應，最低負擔。
  const handleLog = async (outcome: 'completed' | 'tried') => {
    if (!rec || !selectedChildId) return
    setLogging(true)
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          activityId: rec.id,
          outcome,
          childReaction: outcome === 'completed' ? 'happy' : 'neutral',
        }),
      })
      // 記錄失敗也照樣給正向結束畫面——別讓家長卡在這；紀錄非關鍵路徑。
    } catch (err) {
      console.error('Failed to log:', err)
    } finally {
      setLogging(false)
      setLogged(outcome)
    }
    // 記錄後抓連續天數與本週次數，給結束畫面正向回饋（次要：失敗就只顯示原本文案，不擋流程）
    try {
      const res = await fetchWithTimeout(`/api/insights?childId=${selectedChildId}`)
      if (res.ok) {
        const data = await res.json()
        if (typeof data.streak === 'number' && data.streak > 0) setStreak(data.streak)
        if (typeof data.weekly?.sessions === 'number' && data.weekly.sessions > 0) {
          setWeeklySessions(data.weekly.sessions)
        }
      }
    } catch {
      // 無洞察就維持原本的結束畫面
    }
  }

  const restart = () => {
    seenIds.current = new Set()
    setExhausted(false)
    setLogged(null)
    setStreak(null)
    setWeeklySessions(null)
    setStale(false)
    setRec(null)
    load([], 'initial')
  }

  // 白話化的推薦理由（過濾引擎術語）；算一次供卡片重用
  const reasons = friendlyReasons(rec?.reasons)

  // 載入骨架：用內容形狀的占位取代孤零零的轉圈，預留空間避免出答案時跳版（CLS）。
  // 純色塊脈動，prefers-reduced-motion 會被全站重置降為靜態。
  const RecSkeleton = () => (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex flex-col items-center gap-1.5">
        <span className="h-7 w-32 animate-pulse rounded-full bg-brand-tint" />
        <span className="h-3 w-48 animate-pulse rounded-full bg-border/60" />
      </div>
      <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-clay">
        <span className="block h-6 w-3/4 animate-pulse rounded-lg bg-border/70" />
        <div className="flex gap-1.5">
          <span className="h-5 w-16 animate-pulse rounded-full bg-brand-tint" />
          <span className="h-5 w-20 animate-pulse rounded-full bg-border/50" />
        </div>
        <span className="block h-12 w-full animate-pulse rounded-lg bg-brand-tint" />
        <span className="block h-11 w-full animate-pulse rounded-lg bg-border/40" />
      </div>
    </div>
  )

  // ── 結束畫面：記錄後 ──
  if (logged) {
    return (
      <PageShell withNav>
        <ChildSwitcher />
        <Card className="space-y-4 py-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-success-tint text-success">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-text">記下了 ☁️</p>
            <p className="text-sm text-muted">
              {logged === 'completed' ? '陪伴完成，每一次都算數。' : '試過了也很好，下次再來。'}
            </p>
          </div>
          {/* 連續陪伴天數：把抽象努力變成看得見的火苗，強化「明天也想再來」 */}
          {streak && streak >= 1 ? (
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-4 py-2 shadow-clay-sm ring-1 ring-brand/15">
              <Icon name="sparkle" className="h-[16px] w-[16px] text-brand" />
              <span className="text-sm font-semibold text-brand-strong">連續陪伴 {streak} 天</span>
            </div>
          ) : null}
          {/* 本週累計次數：給「你這週做得很好」的正向回饋 */}
          {weeklySessions && weeklySessions >= 1 ? (
            <p className="text-xs text-muted">本週已經陪了 {weeklySessions} 次 💛</p>
          ) : null}
          <div className="space-y-2">
            <Button size="lg" icon="sparkle" onClick={restart} className="w-full">
              再陪一個
            </Button>
            <LinkButton href="/history" variant="secondary" size="lg" icon="history">
              看陪伴紀錄
            </LinkButton>
          </div>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <ChildSwitcher />
      {/* 有選到孩子才顯示導覽：沒孩子時 /now 會導去 onboarding，提前顯示會閃一下 */}
      {selectedChildId && <FirstRunHint />}

      {loading ? (
        <div role="status" aria-live="polite">
          <p className="mb-4 text-center text-sm text-muted">幫你選一個現在就能玩的…</p>
          <RecSkeleton />
        </div>
      ) : error ? (
        <Card className="space-y-4 py-10 text-center">
          <p className="text-danger" role="alert">
            {error}
          </p>
          <Button size="lg" icon="refresh" onClick={restart} className="w-full">
            再試一次
          </Button>
        </Card>
      ) : exhausted && !rec ? (
        <div className="space-y-4">
          <Card className="space-y-3 py-8 text-center">
            <p className="text-text">這個時段的活動都看過了。</p>
            <p className="text-sm text-muted">換個精力或情境，常常就有新的。</p>
            <LinkButton href="/select" variant="primary" size="lg" icon="compass">
              自己挑狀態
            </LinkButton>
          </Card>
          {selectedChildId && <AIGenerateCard childId={selectedChildId} />}
        </div>
      ) : rec ? (
        <div className="space-y-4">
          {/* 依時段的擬人問候：大波波 + 一句安撫的話，給主畫面「家」的溫度（取代先前的純站名列）。 */}
          {(() => {
            const g = nowGreeting()
            return (
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[image:var(--gradient-brand)] shadow-brand ring-4 ring-brand-tint">
                  <Mascot className="h-11 w-11" />
                </span>
                <div>
                  <p className="flex items-center justify-center gap-1.5 font-display text-lg font-bold text-text">
                    <Icon name={g.icon} className="h-[18px] w-[18px] text-brand" />
                    {g.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{g.subtitle}</p>
                </div>
              </div>
            )
          })()}

          {stale && (
            <p
              className="flex items-center justify-center gap-1.5 rounded-xl bg-warning-tint px-4 py-2.5 text-center text-xs text-warning"
              role="status"
            >
              <Icon name="info" className="h-[14px] w-[14px] shrink-0" />
              目前離線，顯示的是上次的方案
            </p>
          )}

          {/* 主答案卡：玻璃霧面 + 後方牌組邊（抽牌隱喻：暗示還有別的玩法可換）。 */}
          <div className="relative">
            {/* 後方牌組邊，純裝飾；換到沒得換（exhausted）時收掉，不再暗示有下一張。 */}
            {!exhausted && isRealActivity(rec.id) && (
              <>
                <span
                  aria-hidden
                  className="absolute inset-x-3 -bottom-2 top-2 rounded-3xl bg-surface opacity-60 shadow-clay-sm"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-1.5 -bottom-1 top-1 rounded-3xl bg-card opacity-80 shadow-clay-sm"
                />
              </>
            )}
            <Card className="relative space-y-3.5 bg-card/85 ring-2 ring-brand/50 backdrop-blur-md">
              {/* 領域徽章（圖示＋領域字一體，取代看不懂的縮圖）＋ 收藏愛心 */}
              <div className="flex items-start justify-between gap-2">
                {rec.developmentalFocus?.[0] ? (
                  <FocusBadge focus={rec.developmentalFocus[0]} />
                ) : (
                  <span />
                )}
                {isRealActivity(rec.id) && (
                  <SaveHeart activityId={rec.id} className="-mr-1 -mt-1" />
                )}
              </div>

              <h1 className="text-2xl font-bold leading-tight text-text">{rec.title}</h1>

              {/* 一句白話開場白：直接告訴家長「怎麼開始玩」，不必先點進詳情。 */}
              {isRealActivity(rec.id) && rec.openingLine && (
                <p className="rounded-xl bg-brand-tint/70 px-3.5 py-2.5 text-sm leading-relaxed text-text">
                  {rec.openingLine}
                </p>
              )}

              {/* 領域已由上方徽章呈現，這裡只補時長與刺激強度，避免重複。 */}
              <ActivityMeta
                minDurationMinutes={rec.minDurationMinutes}
                maxDurationMinutes={rec.maxDurationMinutes}
                stimulationLevel={rec.stimulationLevel}
              />

              {reasons.length > 0 && (
                <ul className="space-y-1.5 text-xs text-muted">
                  {reasons.slice(0, 2).map((reason) => (
                    <li key={reason} className="flex items-start gap-1.5">
                      <Icon
                        name="check"
                        className="mt-0.5 h-[14px] w-[14px] shrink-0 text-success"
                      />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* 引擎在無匹配時會回「安全回退」方案，其 id 非真實活動 UUID、沒有詳情頁。
                  此時不要渲染會 404 的「開始這個活動」，改提示這就是當下可做的小事。 */}
              {isRealActivity(rec.id) ? (
                <LinkButton
                  href={`/activity/${rec.id}?childId=${selectedChildId}`}
                  size="lg"
                  icon="book"
                  className="w-full"
                >
                  開始這個活動
                </LinkButton>
              ) : (
                <p className="rounded-xl bg-brand-tint/60 px-4 py-3 text-center text-sm text-text">
                  這個就很適合現在——坐到孩子旁邊，直接開始吧。
                </p>
              )}

              {/* 「換一個」＝抽牌隱喻：虛線邊 + 抽牌文案，呼應後方的牌組。 */}
              {isRealActivity(rec.id) && (
                <Button
                  variant="secondary"
                  size="md"
                  icon="refresh"
                  loading={shuffling}
                  disabled={exhausted}
                  onClick={handleShuffle}
                  className="w-full border-dashed"
                >
                  {exhausted ? '暫時沒有更多了' : '抽下一個玩法'}
                </Button>
              )}
            </Card>
          </div>

          {/* 換到沒得換時，給「請 AI 生一個」的出口 */}
          {exhausted && selectedChildId && <AIGenerateCard childId={selectedChildId} />}

          {/* 玩完一鍵記錄，不必填表。回退方案非真實活動、無法記錄，不顯示以免「記下了」假象。 */}
          {isRealActivity(rec.id) && (
            <div className="space-y-2">
              <p className="text-center text-xs text-muted">玩過了嗎？一鍵記一下</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  icon="faceHappy"
                  loading={logging}
                  onClick={() => handleLog('completed')}
                >
                  做完了
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  icon="faceNeutral"
                  loading={logging}
                  onClick={() => handleLog('tried')}
                >
                  沒成功
                </Button>
              </div>
            </div>
          )}

          <Link
            href="/select"
            className="mx-auto flex items-center justify-center gap-1.5 text-sm font-medium text-muted transition-opacity hover:opacity-70"
          >
            <Icon name="compass" className="h-[16px] w-[16px]" />
            想自己挑狀態
          </Link>
        </div>
      ) : null}
    </PageShell>
  )
}
