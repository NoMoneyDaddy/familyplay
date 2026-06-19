'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { AdSlot } from '@/app/components/ad-slot'
import { FocusIllustration } from '@/app/components/focus-illustration'
import { Mascot } from '@/app/components/mascot'
import { SaveHeart } from '@/app/components/save-heart'
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
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useGoBack } from '@/lib/use-go-back'

interface Recommendation {
  id: string
  title: string
  score: number
  reasons: string[]
  minDurationMinutes?: number
  maxDurationMinutes?: number
  stimulationLevel?: 'low' | 'medium' | 'high'
  developmentalFocus?: string[]
}

// 真實活動才有詳情頁（DB UUID）；引擎合成的安全回退方案 id 非 UUID，無對應頁面。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isRealActivity(id: string): boolean {
  return UUID_RE.test(id)
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

  const childId = searchParams.get('childId') || ''
  const parentEnergy = searchParams.get('parentEnergy') || ''
  const context = searchParams.get('context') || ''

  const load = useCallback(
    async (excludeIds: string[], mode: 'initial' | 'shuffle') => {
      if (!childId || !parentEnergy || !context) {
        setError('缺少必要的參數')
        setLoading(false)
        return
      }
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
        })
        const data = await res.json()
        if (data.error) {
          // 換一批失敗不該清掉現有結果；只在初次載入時顯示錯誤畫面
          if (mode === 'initial') setError(data.error)
          return
        }
        const next: Recommendation[] = data.recommendations || []
        // 換一批換不到新的（只剩看過的或安全兜底）→ 標記已看完，不覆蓋現有清單
        const allSeen = mode === 'shuffle' && next.every((r) => seenIds.current.has(r.id))
        if (allSeen) {
          setExhausted(true)
          return
        }
        for (const r of next) seenIds.current.add(r.id)
        setRecommendations(next)
      } catch (err) {
        // 不把技術錯誤（如 502 回非 JSON 時的 "Unexpected token <…"）直接顯示給家長
        console.error('Failed to fetch recommendations:', err)
        if (mode === 'initial') setError('系統忙線或網路不穩，請稍後再試。')
      } finally {
        setLoading(false)
        setShuffling(false)
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
          <p className="text-danger">錯誤：{error}</p>
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
            return (
              <Card
                as="li"
                key={rec.id}
                className={isTop ? 'relative ring-2 ring-brand/60' : 'relative'}
              >
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
                {isTop && friendlyReasons(rec.reasons).length > 0 && (
                  <ul className="mb-4 space-y-1.5 text-xs text-muted">
                    {friendlyReasons(rec.reasons).map((reason) => (
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
            載入推薦中...
          </p>
        </PageShell>
      }
    >
      <RecommendationsPageInner />
    </Suspense>
  )
}
