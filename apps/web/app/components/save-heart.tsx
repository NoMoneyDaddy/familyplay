'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/app/components/ui'

// 收藏愛心：自查初始狀態、樂觀 toggle、失敗回復。可放在任何已知 activityId 的卡片上。
// initialSaved 可由父層預先帶入（已知狀態時），省掉自查。
export function SaveHeart({
  activityId,
  initialSaved,
  className = '',
}: {
  activityId: string
  initialSaved?: boolean
  className?: string
}) {
  const [saved, setSaved] = useState(initialSaved ?? false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (initialSaved !== undefined) return // 父層已給狀態就不自查
    let cancelled = false
    fetch('/api/saved')
      .then((res) => (res.ok ? res.json() : { saved: [] }))
      .then((data) => {
        if (!cancelled) {
          setSaved(
            (data.saved ?? []).some((s: { activity_id: string }) => s.activity_id === activityId),
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityId, initialSaved])

  const toggle = async () => {
    if (pending) return
    const next = !saved
    setSaved(next)
    setPending(true)
    try {
      const res = next
        ? await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId }),
          })
        : await fetch(`/api/saved?activityId=${activityId}`, { method: 'DELETE' })
      if (!res.ok) setSaved(!next)
    } catch {
      setSaved(!next)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? '取消收藏' : '收藏這個活動'}
      className={`shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-brand-tint active:scale-95 ${className}`}
    >
      <Icon
        name="heart"
        className={`h-[22px] w-[22px] ${saved ? 'fill-current text-brand' : ''}`}
      />
    </button>
  )
}
