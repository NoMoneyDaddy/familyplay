'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

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
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mb-4 text-4xl" aria-hidden="true">
            🤔
          </div>
          <p className="text-[--color-muted]">正在思考最好的方案...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="text-center" role="alert">
          <p className="text-red-600">錯誤：{error}</p>
          <Link
            href="/select"
            className="mt-4 inline-block rounded-lg border border-[--color-border] px-4 py-2 font-semibold text-[--color-text]"
          >
            <span aria-hidden="true">↺ </span>重新選擇狀態
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">今天的陪伴方案</h1>
          <p className="text-[--color-muted]">根據現在的狀態，這些活動最適合你</p>
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-[--color-muted]">暫時沒有合適的推薦</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {recommendations.map((rec, idx) => (
              <li key={rec.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="flex-1 text-xl font-semibold text-[--color-text]">
                    {idx + 1}. {rec.title}
                  </h2>
                  <div className="text-lg font-bold text-[--color-brand]">
                    <span className="sr-only">適合度 </span>
                    {rec.score.toFixed(1)}
                  </div>
                </div>

                {rec.reasons.length > 0 && (
                  <ul className="mb-4 space-y-1 text-xs text-[--color-muted]">
                    {rec.reasons.map((reason, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Recommendation reasons are static and ordered
                      <li key={i}>
                        <span aria-hidden="true">✓ </span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/activity/${rec.id}?childId=${childId}`}
                  className="block w-full rounded-lg bg-[--color-brand] py-3 text-center font-semibold text-white transition-transform active:scale-[0.97]"
                >
                  <span aria-hidden="true">📖 </span>開始這個活動
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/select"
          className="block w-full rounded-lg border border-[--color-border] py-3 text-center font-semibold text-[--color-text]"
        >
          <span aria-hidden="true">↺ </span>重新選擇狀態
        </Link>
      </div>
    </main>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-[--color-muted]" role="status">
            載入推薦中...
          </p>
        </main>
      }
    >
      <RecommendationsPageInner />
    </Suspense>
  )
}
