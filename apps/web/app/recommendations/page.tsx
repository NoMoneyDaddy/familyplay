'use client'

import { allRecommendationsSeen } from '@familyplay/data'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { AdSlot } from '@/app/components/ad-slot'
import { FocusIllustration } from '@/app/components/focus-illustration'
import { Mascot } from '@/app/components/mascot'
import { SaveHeart } from '@/app/components/save-heart'
import { SponsorSlot } from '@/app/components/sponsor-slot'
import {
  ActivityMeta,
  Button,
  Card,
  friendlyReasons,
  Icon,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout, isAbortError } from '@/lib/fetch-timeout'
import { isRealActivity, type Recommendation } from '@/lib/recommendation'
import { useGoBack } from '@/lib/use-go-back'

// 卡片進場：依序淡入＋輕微上浮，讓「最適合的先到」有方向感（motion-meaning）。
// 只用 opacity/transform（不動版位、無 CLS）；prefers-reduced-motion 時直接顯示、不位移。
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(true)
      return
    }
    const t = setTimeout(() => setShown(true), 40 * index)
    return () => clearTimeout(t)
  }, [index])
  return (
    <li
      className="transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(10px)',
      }}
    >
      {children}
    </li>
  )
}

function RecommendationsPageInner() {
  const searchParams = useSearchParams()
  const goBack = useGoBack('/select')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 一次抓收藏清單，逐卡以 initialSaved 傳入 SaveHeart，避免每張卡各打一次 /api/saved。
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  // 累積看過的活動 id，「換一批」時整批排除，確保每次都換不同的。
  const seenIds = useRef<Set<string>>(new Set())
  // 請求序號：防止快速連點「換一批」時，較舊的回應亂序覆蓋較新的結果/seenIds（競態）。
  const reqSeq = useRef(0)
  // 進行中的請求：開新請求前 abort 舊的，省下伺服器白算的推薦、也讓被超車的請求即時結束。
  const inFlight = useRef<AbortController | null>(null)

  const childId = searchParams.get('childId') || ''
  const parentEnergy = searchParams.get('parentEnergy') || ''
  const context = searchParams.get('context') || ''

  const load = useCallback(
    async (excludeIds: string[], mode: 'initial' | 'shuffle') => {
      if (!childId || !parentEnergy || !context) {
        setError('資料不齊，請重新選一次狀態')
        setLoading(false)
        return
      }
      // 標記本次請求序號；await 之後若已被更新的請求超車（reqSeq 變大），就放棄寫入狀態。
      const myReq = ++reqSeq.current
      // 取消上一個還在飛的請求，再為本次建立新的 controller。
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      if (mode === 'shuffle') setShuffling(true)
      else setLoading(true)
      setError(null)
      try {
        const res = await fetchWithTimeout('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            parentEnergy,
            context,
            availableSpace: 'anywhere',
            availableResources: [],
            maxDurationMinutes: 20,
            excludeIds,
          }),
          signal: controller.signal,
        })
        const data = await res.json()
        // 被更新的請求超車 → 這份是過期結果，丟棄不寫狀態/seenIds，避免亂序覆蓋
        if (myReq !== reqSeq.current) return
        if (data.error) {
          // 換一批失敗不該清掉現有結果；只在初次載入時顯示錯誤畫面
          if (mode === 'initial') setError(data.error)
          return
        }
        const next: Recommendation[] = data.recommendations || []
        // 換一批換不到新的（只剩看過的或安全兜底）→ 標記已看完，不覆蓋現有清單
        const allSeen = mode === 'shuffle' && allRecommendationsSeen(next, seenIds.current)
        if (allSeen) {
          setExhausted(true)
          return
        }
        for (const r of next) seenIds.current.add(r.id)
        setRecommendations(next)
      } catch (err) {
        // 被新請求超車而主動 abort 的：靜默忽略，不是錯誤也不該洗 log
        if (isAbortError(err) && myReq !== reqSeq.current) return
        // 不把技術錯誤（如 502 回非 JSON 時的 "Unexpected token <…"）直接顯示給家長
        console.error('Failed to fetch recommendations:', err)
        if (myReq === reqSeq.current && mode === 'initial') {
          setError('系統忙線或網路不穩，請稍後再試。')
        }
      } finally {
        // 只有最新請求能關掉 spinner，避免過期請求提前收掉新請求的載入態
        if (myReq === reqSeq.current) {
          setLoading(false)
          setShuffling(false)
        }
      }
    },
    [childId, parentEnergy, context],
  )

  useEffect(() => {
    seenIds.current = new Set()
    setExhausted(false)
    load([], 'initial')
  }, [load])

  const handleShuffle = () => load([...seenIds.current], 'shuffle')

  useEffect(() => {
    let cancelled = false
    fetchWithTimeout('/api/saved')
      .then((res) => (res.ok ? res.json() : { saved: [] }))
      .then((data) => {
        if (!cancelled) {
          setSavedIds(
            new Set((data.saved ?? []).map((s: { activity_id: string }) => s.activity_id)),
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <PageShell>
        <div
          className="flex flex-col items-center gap-4 py-16 text-center"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-20 w-20 animate-bounce items-center justify-center rounded-[26px] bg-[image:var(--gradient-brand)] shadow-brand ring-4 ring-brand-tint">
            <Mascot className="h-14 w-14" />
          </span>
          <p className="font-medium text-text">波波正在想最適合的方案…</p>
          <span className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <div className="space-y-4 py-12 text-center" role="alert">
          <p className="text-danger">{error}</p>
          <LinkButton href="/select" variant="secondary" size="lg" icon="refresh">
            重新選擇狀態
          </LinkButton>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="今天的陪伴方案"
        subtitle="根據現在的狀態，這些活動最適合你"
        align="center"
        onBack={goBack}
      />

      {recommendations.length === 0 ? (
        <Card className="space-y-4 text-center">
          <p className="text-text">這個組合暫時沒有完全合適的活動。</p>
          <p className="text-sm text-muted">換個精力或情境，常常就有了。</p>
          <LinkButton href="/select" variant="primary" size="lg" icon="refresh">
            換個狀態再試
          </LinkButton>
        </Card>
      ) : (
        <ol className="space-y-4">
          {recommendations.map((rec, idx) => {
            const isTop = idx === 0
            const reasons = friendlyReasons(rec.reasons)
            return (
              <Reveal index={idx} key={rec.id}>
                <Card className={isTop ? 'relative ring-2 ring-brand/60' : 'relative'}>
                  {isTop && (
                    <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-brand)] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-brand">
                      <Icon name="star" className="h-[12px] w-[12px]" />
                      最適合
                    </span>
                  )}
                  <div className="mb-4 flex items-start gap-3">
                    {/* 領域插畫縮圖（含右下角排名徽章），仿競品卡片的配圖質感 */}
                    <FocusIllustration
                      focus={rec.developmentalFocus?.[0]}
                      rank={idx + 1}
                      isTop={isTop}
                    />
                    <h2 className="min-w-0 flex-1 pt-1.5 text-lg font-semibold leading-snug text-text">
                      {rec.title}
                    </h2>
                    {/* 一鍵收藏主答案，不必先打開活動 */}
                    <SaveHeart
                      activityId={rec.id}
                      initialSaved={savedIds.has(rec.id)}
                      className="-mr-1"
                    />
                  </div>

                  <ActivityMeta
                    developmentalFocus={rec.developmentalFocus}
                    minDurationMinutes={rec.minDurationMinutes}
                    maxDurationMinutes={rec.maxDurationMinutes}
                    stimulationLevel={rec.stimulationLevel}
                    className="mb-4"
                  />

                  {/* 只在最適合的卡列出理由，其餘保持安靜——一個主答案，不是並排比較。
                    用 friendlyReasons 過濾掉引擎內部術語，只留家長看得懂的話。 */}
                  {isTop && reasons.length > 0 && (
                    <ul className="mb-4 space-y-1.5 text-xs text-muted">
                      {reasons.map((reason) => (
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

                  {/* 安全回退方案 id 非真實活動 UUID、無詳情頁；不渲染會 404 的連結。 */}
                  {isRealActivity(rec.id) ? (
                    <LinkButton
                      href={`/activity/${rec.id}?childId=${childId}`}
                      variant={isTop ? 'primary' : 'secondary'}
                      size="lg"
                      icon="book"
                    >
                      開始這個活動
                    </LinkButton>
                  ) : (
                    <p className="rounded-xl bg-brand-tint/60 px-4 py-3 text-center text-sm text-text">
                      這個就很適合現在——坐到孩子旁邊，直接開始吧。
                    </p>
                  )}
                </Card>
              </Reveal>
            )
          })}
        </ol>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-2">
          {/* 不喜歡這幾個就換一批不同的，免得家長被迫重跑整個流程 */}
          <Button
            variant="secondary"
            size="lg"
            icon="refresh"
            loading={shuffling}
            disabled={exhausted}
            onClick={handleShuffle}
            className="w-full"
          >
            {exhausted ? '暫時沒有更多了' : '換一批不同的'}
          </Button>
          {exhausted && (
            <p className="text-center text-xs text-muted">
              這個狀態下的活動都看過了，換個精力或情境會有新的。
            </p>
          )}
        </div>
      )}

      <LinkButton href="/select" variant="secondary" size="lg" icon="refresh">
        重新選擇狀態
      </LinkButton>

      {/* 輕度廣告：僅對免費用戶顯示、且需設定 AdSense；放在底部不干擾 */}
      <AdSlot className="pt-2" />
      {/* 贊助小卡（在地親子資源）：同樣僅免費用戶可見，付費去廣告即隱藏 */}
      <SponsorSlot placement="recommendations" className="pt-1" />

      <p className="px-2 text-center text-xs leading-relaxed text-faint">
        活動建議僅供親子陪伴參考，非醫療或專業評估，請由成人全程監護。詳見{' '}
        <Link href="/disclaimer" className="underline hover:text-muted">
          免責聲明
        </Link>
        。
      </p>
    </PageShell>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="py-12 text-center text-muted" role="status">
            正在幫你找…
          </p>
        </PageShell>
      }
    >
      <RecommendationsPageInner />
    </Suspense>
  )
}
