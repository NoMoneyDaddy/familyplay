'use client'

import { useEffect, useState } from 'react'
import {
  ActivityMeta,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'

interface SavedActivity {
  id: string
  title: string
  minDurationMinutes?: number
  maxDurationMinutes?: number
  stimulationLevel?: 'low' | 'medium' | 'high'
  developmentalFocus?: string[]
}

// Supabase 巢狀關聯可能回物件或陣列；統一取出第一筆。
function pickActivity(row: {
  activity_id: string
  companion_activities: Record<string, unknown> | Record<string, unknown>[] | null
}): SavedActivity | null {
  const a = Array.isArray(row.companion_activities)
    ? row.companion_activities[0]
    : row.companion_activities
  if (!a) return null
  return {
    id: a.id as string,
    title: a.title as string,
    minDurationMinutes: a.min_duration_minutes as number | undefined,
    maxDurationMinutes: a.max_duration_minutes as number | undefined,
    stimulationLevel: a.stimulation_level as SavedActivity['stimulationLevel'],
    developmentalFocus: a.developmental_focus as string[] | undefined,
  }
}

export default function SavedPage() {
  const [items, setItems] = useState<SavedActivity[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/saved')
      .then((res) => (res.ok ? res.json() : { saved: [] }))
      .then((data) => {
        if (cancelled) return
        const list = (data.saved ?? []).map(pickActivity).filter(Boolean) as SavedActivity[]
        setItems(list)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageShell>
      <PageHeader title="我的收藏" subtitle="存下喜歡的活動，想玩時 2 下就找到" />

      {items === null ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="還沒有收藏">
          在任何活動頁點愛心 ♥，就會收進這裡，之後不用重跑流程也找得到。
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <Card as="li" key={a.id} className="space-y-3">
              <h2 className="text-lg font-semibold leading-snug text-text">{a.title}</h2>
              <ActivityMeta
                developmentalFocus={a.developmentalFocus}
                minDurationMinutes={a.minDurationMinutes}
                maxDurationMinutes={a.maxDurationMinutes}
                stimulationLevel={a.stimulationLevel}
              />
              <LinkButton href={`/activity/${a.id}`} variant="secondary" size="md" icon="book">
                開始這個活動
              </LinkButton>
            </Card>
          ))}
        </ul>
      )}
    </PageShell>
  )
}
