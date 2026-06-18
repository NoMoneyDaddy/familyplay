'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AdSlot } from '@/app/components/ad-slot'
import { FocusIllustration } from '@/app/components/focus-illustration'
import { Mascot } from '@/app/components/mascot'
import { ActivityMeta, Card, Icon, LinkButton, PageHeader, PageShell } from '@/app/components/ui'

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

function RecommendationsPageInner() {
  const searchParams = useSearchParams()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const childId = searchParams.get('childId') || ''
  const parentEnergy = searchParams.get('parentEnergy') || ''
  const context = searchParams.get('context') || ''

  useEffect(() => {
    if (!childId || !parentEnergy || !context) {
      setError('缺少必要的參數')
      setLoading(false)
      return
    }

    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        parentEnergy,
        context,
        availableSpace: 'anywhere',
        availableResources: [],
        maxDurationMinutes: 20,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          // 後端正常時必有陣列；仍以 [] 兜底，避免 undefined 讓 .length/.map 崩潰
          setRecommendations(data.recommendations || [])
        }
      })
      .catch((err) => {
        // 不把技術錯誤（如 502 回非 JSON 時的 "Unexpected token <…"）直接顯示給家長
        console.error('Failed to fetch recommendations:', err)
        setError('系統忙線或網路不穩，請稍後再試。')
      })
      .finally(() => setLoading(false))
  }, [childId, parentEnergy, context])

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
      />

      {recommendations.length === 0 ? (
        <Card className="text-center">
          <p className="text-muted">暫時沒有合適的推薦</p>
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
                  <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
                    <span className="sr-only">適合度 </span>
                    {rec.score.toFixed(1)}
                  </span>
                </div>

                <ActivityMeta
                  developmentalFocus={rec.developmentalFocus}
                  minDurationMinutes={rec.minDurationMinutes}
                  maxDurationMinutes={rec.maxDurationMinutes}
                  stimulationLevel={rec.stimulationLevel}
                  className="mb-4"
                />

                {rec.reasons.length > 0 && (
                  <ul className="mb-4 space-y-1.5 text-xs text-muted">
                    {rec.reasons.map((reason, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Recommendation reasons are static and ordered
                      <li key={i} className="flex items-start gap-1.5">
                        <Icon
                          name="check"
                          className="mt-0.5 h-[14px] w-[14px] shrink-0 text-success"
                        />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <LinkButton
                  href={`/activity/${rec.id}?childId=${childId}`}
                  variant={isTop ? 'primary' : 'secondary'}
                  size="lg"
                  icon="book"
                >
                  開始這個活動
                </LinkButton>
              </Card>
            )
          })}
        </ol>
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
