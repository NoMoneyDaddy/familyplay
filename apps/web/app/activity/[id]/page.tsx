'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'

interface Activity {
  id: string
  title: string
  openingLine: string
  steps: string[]
  followUpQuestions: string[]
  endingLine?: string
  minDurationMinutes: number
  maxDurationMinutes: number
}

const REACTION_LABELS: Record<string, string> = {
  happy: '開心 😊',
  engaged: '投入 ✨',
  neutral: '普通 😐',
  leaving: '想離開 🚶',
  disinterested: '沒興趣 😶',
  calmed: '平靜了 😌',
}

const OUTCOME_LABELS: Record<string, string> = {
  completed: '完成 ✅',
  tried: '嘗試了 🔸',
  abandoned: '中途放棄 ⏹️',
}

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [outcome, setOutcome] = useState<'completed' | 'tried' | 'abandoned'>('completed')
  const [childReaction, setChildReaction] = useState<
    'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'
  >('happy')
  const [startTime] = useState(Date.now())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((res) => res.json())
      .then((data) => setActivity(data))
      .catch(() => setActivity(null))
      .finally(() => setActivityLoading(false))
  }, [id])

  const handleComplete = async () => {
    setLoading(true)

    const durationSecs = Math.round((Date.now() - startTime) / 1000)
    const childId = new URLSearchParams(window.location.search).get('childId')

    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          activityId: id,
          outcome,
          childReaction,
          durationSecs,
        }),
      })

      router.push('/select')
    } finally {
      setLoading(false)
    }
  }

  if (activityLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-[--color-muted]">加載活動中...</p>
      </main>
    )
  }

  if (!activity) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">活動不存在</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[--color-text]">{activity.title}</h1>

          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-[--color-brand]">{activity.openingLine}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[--color-text]">步驟</h3>
              <ol className="space-y-2">
                {activity.steps.map((step, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Activity steps are static and ordered
                  <li key={i} className="flex gap-3">
                    <span className="font-semibold text-[--color-brand]">{i + 1}</span>
                    <span className="text-[--color-text]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {activity.followUpQuestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[--color-text]">跟進問題</h3>
                <ul className="space-y-1">
                  {activity.followUpQuestions.map((q, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Follow-up questions are static and ordered
                    <li key={i} className="text-sm text-[--color-muted]">
                      • {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-[--color-muted]">
              ⏱️ 約 {activity.minDurationMinutes}–{activity.maxDurationMinutes} 分鐘
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-[--color-text]">活動結果</h3>

          <div className="space-y-2">
            <div className="block text-sm font-semibold text-[--color-text]">孩子的反應</div>
            <div className="grid grid-cols-2 gap-2">
              {['happy', 'engaged', 'neutral', 'leaving', 'disinterested', 'calmed'].map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={childReaction === r}
                  onClick={() =>
                    setChildReaction(
                      r as 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed',
                    )
                  }
                  className={`rounded-lg p-2 text-xs font-medium ${
                    childReaction === r ? 'bg-[--color-brand] text-white' : 'bg-[--color-bg]'
                  }`}
                >
                  {REACTION_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="block text-sm font-semibold text-[--color-text]">活動完成度</div>
            <div className="grid grid-cols-3 gap-2">
              {['completed', 'tried', 'abandoned'].map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={outcome === o}
                  onClick={() => setOutcome(o as 'completed' | 'tried' | 'abandoned')}
                  className={`rounded-lg p-2 text-xs font-medium ${
                    outcome === o ? 'bg-[--color-brand] text-white' : 'bg-[--color-bg]'
                  }`}
                >
                  {OUTCOME_LABELS[o]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="w-full rounded-lg bg-[--color-brand] py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? '記錄中...' : '✅ 完成並記錄'}
          </button>
        </div>
      </div>
    </main>
  )
}
