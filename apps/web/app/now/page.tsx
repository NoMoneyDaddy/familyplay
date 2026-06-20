'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AIGenerateCard } from '@/app/components/ai-generate-card'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { FirstRunHint } from '@/app/components/first-run-hint'
import { Mascot } from '@/app/components/mascot'
import {
  ActivityMeta,
  Button,
  Card,
  friendlyReasons,
  Icon,
  LinkButton,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useChildStore } from '@/lib/stores/useChildStore'

interface Rec {
  id: string
  title: string
  reasons: string[]
  minDurationMinutes?: number
  maxDurationMinutes?: number
  stimulationLevel?: 'low' | 'medium' | 'high'
  developmentalFocus?: string[]
}

// 一鍵「現在就陪」：不問年齡、不問精力、不問情境——用上次的孩子、依時段自動帶情境、
// 精力預設「有點累」，直接給「一個」主答案。想換就按「換一個」，玩完就一鍵記錄。
// 預設精力刻意取偏低：疲憊家長是常態，給低負擔方案最安全；想精挑可走「自己挑狀態」。
const DEFAULT_ENERGY = 'low'

function timeDefaultContext(): string {
  const hour = new Date().getHours()
  return hour >= 19 || hour < 5 ? 'bedtime' : 'normal'
}

// 真實活動才有詳情頁（DB UUID）；引擎合成的安全回退方案 id 非 UUID，無對應頁面。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isRealActivity(id: string): boolean {
  return UUID_RE.test(id)
}

// 離線快取：記住每個孩子上次成功拿到的主方案，斷網/掛起時還能顯示一個能玩的，
// 而非只給錯誤畫面。localStorage 在隱私模式可能 throw，全包 try-catch。
const cacheKey = (childId: string) => `fp_now_rec_${childId}`
function saveCachedRec(childId: string, rec: Rec) {
  try {
    localStorage.setItem(cacheKey(childId), JSON.stringify(rec))
  } catch {
    // 寫入失敗僅是無法離線回放，不影響本次
  }
}
function readCachedRec(childId: string): Rec | null {
  try {
    const raw = localStorage.getItem(cacheKey(childId))
    return raw ? (JSON.parse(raw) as Rec) : null
  } catch {
    return null
  }
}

export default function NowPage() {
  const router = useRouter()
  const selectedChildId = useChildStore((s) => s.selectedChildId)
  const hasHydrated = useChildStore((s) => s.hasHydrated)

  const [rec, setRec] = useState<Rec | null>(null)
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
        const next: Rec | undefined = (data.recommendations || [])[0]
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
            <div className="mx-auto flex items-center gap-2 rounded-full bg-brand-tint px-4 py-2">
              <span className="text-xl" aria-hidden>
                🔥
              </span>
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
        <div
          className="flex flex-col items-center gap-3 py-20 text-center"
          role="status"
          aria-live="polite"
        >
          <span className="h-[22px] w-[22px] animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted">幫你選一個現在就能玩的…</p>
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
          {/* 首頁品牌：波波 + FamilyPlay 站名，讓主畫面有「家」的識別（先前 /now 沒有任何品牌） */}
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2">
              <Mascot className="h-7 w-7" />
              <span className="font-display text-lg font-bold tracking-tight text-text">
                FamilyPlay
              </span>
            </div>
            <p className="text-xs text-muted">現在就陪 · 幫你選好了，直接開始就行</p>
          </div>

          {stale && (
            <p
              className="rounded-xl bg-warning-tint px-4 py-2.5 text-center text-xs text-warning"
              role="status"
            >
              目前離線，顯示的是上次的方案
            </p>
          )}

          <Card className="relative space-y-4 ring-2 ring-brand/60">
            <h1 className="text-xl font-bold leading-snug text-text">{rec.title}</h1>
            <ActivityMeta
              developmentalFocus={rec.developmentalFocus}
              minDurationMinutes={rec.minDurationMinutes}
              maxDurationMinutes={rec.maxDurationMinutes}
              stimulationLevel={rec.stimulationLevel}
            />
            {reasons.length > 0 && (
              <ul className="space-y-1.5 text-xs text-muted">
                {reasons.slice(0, 2).map((reason) => (
                  <li key={reason} className="flex items-start gap-1.5">
                    <Icon name="check" className="mt-0.5 h-[14px] w-[14px] shrink-0 text-success" />
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

            <Button
              variant="secondary"
              size="md"
              icon="refresh"
              loading={shuffling}
              disabled={exhausted}
              onClick={handleShuffle}
              className="w-full"
            >
              {exhausted ? '暫時沒有更多了' : '換一個'}
            </Button>
          </Card>

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
