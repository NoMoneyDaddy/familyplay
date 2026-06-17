'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AdSlot } from '@/app/components/ad-slot'
import { Card, Icon, LinkButton, PageHeader, PageShell } from '@/app/components/ui'

interface Recommendation {
  id: string
  title: string
  score: number
  reasons: string[]
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
          setRecommendations(data.recommendations)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [childId, parentEnergy, context])

  if (loading) {
    return (
      <PageShell>
        <div
          className="flex flex-col items-center gap-3 py-12 text-center"
          role="status"
          aria-live="polite"
        >
          <span className="h-[24px] w-[24px] animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-muted">正在思考最好的方案...</p>
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
          {recommendations.map((rec, idx) => (
            <Card as="li" key={rec.id}>
              <div className="mb-4 flex items-start justify-between">
                <h2 className="flex-1 text-xl font-semibold text-text">
                  {idx + 1}. {rec.title}
                </h2>
                <div className="text-lg font-bold text-brand">
                  <span className="sr-only">適合度 </span>
                  {rec.score.toFixed(1)}
                </div>
              </div>

              {rec.reasons.length > 0 && (
                <ul className="mb-4 space-y-1 text-xs text-muted">
                  {rec.reasons.map((reason, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Recommendation reasons are static and ordered
                    <li key={i} className="flex items-start gap-1.5">
                      <Icon name="check" className="mt-0.5 h-[14px] w-[14px] shrink-0 text-brand" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              <LinkButton href={`/activity/${rec.id}?childId=${childId}`} size="lg" icon="book">
                開始這個活動
              </LinkButton>
            </Card>
          ))}
        </ol>
      )}

      <LinkButton href="/select" variant="secondary" size="lg" icon="refresh">
        重新選擇狀態
      </LinkButton>

      {/* 輕度廣告：僅對免費用戶顯示、且需設定 AdSense；放在底部不干擾 */}
      <AdSlot className="pt-2" />
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
