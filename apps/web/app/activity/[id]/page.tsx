'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { Button, Card, ErrorAlert, Icon, type IconName, PageShell } from '@/app/components/ui'

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

const REACTIONS: { value: Reaction; label: string; icon: IconName }[] = [
  { value: 'happy', label: '開心', icon: 'faceHappy' },
  { value: 'engaged', label: '投入', icon: 'sparkle' },
  { value: 'calmed', label: '平靜了', icon: 'heart' },
  { value: 'neutral', label: '普通', icon: 'faceNeutral' },
  { value: 'disinterested', label: '沒興趣', icon: 'faceSad' },
  { value: 'leaving', label: '想離開', icon: 'logout' },
]

const OUTCOMES: { value: Outcome; label: string; icon: IconName }[] = [
  { value: 'completed', label: '完成', icon: 'check' },
  { value: 'tried', label: '嘗試了', icon: 'refresh' },
  { value: 'abandoned', label: '中途放棄', icon: 'x' },
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((res) => res.json())
      .then((data) => setActivity(data))
      .catch(() => setActivity(null))
      .finally(() => setActivityLoading(false))
  }, [id])

  const handleComplete = async () => {
    // 後端要求 durationSecs 為正整數；秒數可能 < 0.5（快速點擊）四捨五入成 0 而被 400 擋下，
    // 故下限鎖 1 秒。
    const durationSecs = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    const childId = new URLSearchParams(window.location.search).get('childId')

    // 沒有 childId 就送出只會 400 → 先擋下並提示，避免「以為記錄成功」卻什麼都沒存
    if (!childId) {
      setError('找不到孩子資料，請回首頁重新選擇後再記錄。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/log', {
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

      // fetch 對 4xx/5xx 不會 throw；必須檢查 res.ok，否則失敗也會被當成成功跳轉
      if (!res.ok) {
        // session 過期最常見也最可行動 → 給明確提示；其餘維持通用訊息（不直接顯示後端英文）
        setError(
          res.status === 401
            ? '登入已過期，請重新登入後再記錄。'
            : '記錄沒有成功，請稍後再試一次。',
        )
        return
      }

      router.push('/select')
    } catch (err) {
      console.error('Failed to log activity:', err)
      setError('記錄失敗，請檢查網路後再試一次。')
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
          <div className="grid grid-cols-3 gap-2">
            {REACTIONS.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border/60 bg-card px-1 py-3 text-center text-xs font-medium leading-tight text-text shadow-clay-sm transition-all hover:-translate-y-0.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand-strong has-[:checked]:shadow-clay has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50"
              >
                <input
                  type="radio"
                  name="reaction"
                  value={r.value}
                  checked={childReaction === r.value}
                  onChange={() => setChildReaction(r.value)}
                  className="sr-only"
                />
                <Icon name={r.icon} className="h-[22px] w-[22px]" />
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
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border/60 bg-card px-1 py-3 text-center text-xs font-medium leading-tight text-text shadow-clay-sm transition-all hover:-translate-y-0.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand-strong has-[:checked]:shadow-clay has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50"
              >
                <input
                  type="radio"
                  name="outcome"
                  value={o.value}
                  checked={outcome === o.value}
                  onChange={() => setOutcome(o.value)}
                  className="sr-only"
                />
                <Icon name={o.icon} className="h-[18px] w-[18px]" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <ErrorAlert message={error} />

        <Button type="button" onClick={handleComplete} loading={loading} size="lg" icon="check">
          {loading ? '記錄中...' : '完成並記錄'}
        </Button>
      </Card>
    </PageShell>
  )
}
