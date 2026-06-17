'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { Button, Card, Icon, PageShell } from '@/app/components/ui'

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

type Reaction = 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'
type Outcome = 'completed' | 'tried' | 'abandoned'

const REACTIONS: { value: Reaction; label: string }[] = [
  { value: 'happy', label: '開心 😊' },
  { value: 'engaged', label: '投入 ✨' },
  { value: 'neutral', label: '普通 😐' },
  { value: 'leaving', label: '想離開 🚶' },
  { value: 'disinterested', label: '沒興趣 😶' },
  { value: 'calmed', label: '平靜了 😌' },
]

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'completed', label: '完成 ✅' },
  { value: 'tried', label: '嘗試了 🔸' },
  { value: 'abandoned', label: '中途放棄 ⏹️' },
]

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [outcome, setOutcome] = useState<Outcome>('completed')
  const [childReaction, setChildReaction] = useState<Reaction>('happy')
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
      <PageShell>
        <p className="py-12 text-center text-muted" role="status">
          加載活動中...
        </p>
      </PageShell>
    )
  }

  if (!activity) {
    return (
      <PageShell>
        <p className="py-12 text-center text-danger" role="alert">
          活動不存在
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold text-text">{activity.title}</h1>

        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-brand">{activity.openingLine}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-text">步驟</h2>
            <ol className="space-y-2">
              {activity.steps.map((step, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Activity steps are static and ordered
                <li key={i} className="flex gap-3">
                  <span className="font-semibold text-brand">{i + 1}</span>
                  <span className="text-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {activity.followUpQuestions.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-text">跟進問題</h2>
              <ul className="space-y-1">
                {activity.followUpQuestions.map((q, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Follow-up questions are static and ordered
                  <li key={i} className="text-sm text-muted">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Icon name="clock" className="h-[14px] w-[14px]" />約 {activity.minDurationMinutes}–
            {activity.maxDurationMinutes} 分鐘
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-text">活動結果</h2>

        {/* 孩子的反應：單選 radio 群組 */}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-semibold text-text">孩子的反應</legend>
          <div className="grid grid-cols-2 gap-2">
            {REACTIONS.map((r) => (
              <label
                key={r.value}
                className="cursor-pointer rounded-lg border border-border bg-card p-2 text-center text-xs font-medium text-text transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
              >
                <input
                  type="radio"
                  name="reaction"
                  value={r.value}
                  checked={childReaction === r.value}
                  onChange={() => setChildReaction(r.value)}
                  className="sr-only"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* 活動完成度：單選 radio 群組 */}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-semibold text-text">活動完成度</legend>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <label
                key={o.value}
                className="cursor-pointer rounded-lg border border-border bg-card p-2 text-center text-xs font-medium text-text transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
              >
                <input
                  type="radio"
                  name="outcome"
                  value={o.value}
                  checked={outcome === o.value}
                  onChange={() => setOutcome(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="button" onClick={handleComplete} loading={loading} size="lg" icon="check">
          {loading ? '記錄中...' : '完成並記錄'}
        </Button>
      </Card>
    </PageShell>
  )
}
