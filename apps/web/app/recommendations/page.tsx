'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Recommendation {
  id: string
  title: string
  score: number
  reasons: string[]
}

export default function RecommendationsPage() {
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
        <div className="text-center">
          <div className="mb-4 text-4xl">🤔</div>
          <p className="text-[--color-muted]">正在思考最好的方案...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">錯誤: {error}</p>
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
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={rec.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="flex-1 text-xl font-semibold text-[--color-text]">
                    {idx + 1}. {rec.title}
                  </h2>
                  <div className="text-lg font-bold text-[--color-brand]">
                    {rec.score.toFixed(1)}
                  </div>
                </div>

                {rec.reasons.length > 0 && (
                  <ul className="mb-4 space-y-1 text-xs text-[--color-muted]">
                    {rec.reasons.map((reason, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Recommendation reasons are static and ordered
                      <li key={i}>✓ {reason}</li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/activity/${rec.id}?childId=${childId}`}
                  className="block w-full rounded-lg bg-[--color-brand] py-3 text-center font-semibold text-white transition-transform active:scale-[0.97]"
                >
                  📖 開始這個活動
                </Link>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.href = '/select'
          }}
          className="w-full rounded-lg border border-[--color-border] py-3 font-semibold text-[--color-text]"
        >
          ↺ 重新選擇狀態
        </button>
      </div>
    </main>
  )
}
