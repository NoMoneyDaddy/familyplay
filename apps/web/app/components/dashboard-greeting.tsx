'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

// 本地日期鍵（YYYY-MM-DD，使用者所在時區），用來判定「同一天」與連續天數
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 依時段給溫暖問候，避免一成不變
function greetingForNow(): { text: string; icon: 'today' | 'moon' } {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return { text: '早安', icon: 'today' }
  if (h >= 11 && h < 17) return { text: '午安', icon: 'today' }
  if (h >= 17 && h < 23) return { text: '晚安', icon: 'moon' }
  return { text: '夜深了', icon: 'moon' }
}

// 由出生年月（YYYY-MM）算出月齡，再轉成自然的中文年齡片語
function agePhrase(birthYearMonth?: string): string | null {
  if (!birthYearMonth) return null
  const m = /^(\d{4})-(\d{2})$/.exec(birthYearMonth)
  if (!m) return null
  const by = Number(m[1])
  const bm = Number(m[2])
  const now = new Date()
  const months = (now.getFullYear() - by) * 12 + (now.getMonth() + 1 - bm)
  if (months < 0) return null
  if (months < 24) return `${months} 個月`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years} 歲` : `${years} 歲 ${rem} 個月`
}

// 連續陪伴天數：今天（或昨天）有紀錄才起算，往前數連續有紀錄的日子
function computeStreak(dateKeys: Set<string>): number {
  const today = new Date()
  const todayKey = dateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = dateKey(yesterday)

  let cursor: Date
  if (dateKeys.has(todayKey)) cursor = today
  else if (dateKeys.has(yesterdayKey)) cursor = yesterday
  else return 0

  let streak = 0
  while (dateKeys.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

interface LogRow {
  createdAt: string
}

export function DashboardGreeting() {
  const { selectedChildId, children, hasHydrated } = useChildStore()
  const [logs, setLogs] = useState<LogRow[] | null>(null)

  const currentChild = children.find((c) => c.id === selectedChildId)

  useEffect(() => {
    if (!selectedChildId) return
    let cancelled = false
    fetch(`/api/logs?childId=${selectedChildId}`)
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data) => {
        if (!cancelled) setLogs(data.logs || [])
      })
      .catch(() => {
        if (!cancelled) setLogs([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedChildId])

  const stats = useMemo(() => {
    if (!logs) return null
    const todayKey = dateKey(new Date())
    const keys = new Set<string>()
    let todayCount = 0
    for (const log of logs) {
      const d = new Date(log.createdAt)
      const k = dateKey(d)
      keys.add(k)
      if (k === todayKey) todayCount += 1
    }
    return { todayCount, streak: computeStreak(keys) }
  }, [logs])

  // 等孩子資料就緒才顯示，避免閃爍
  if (!hasHydrated || !currentChild) return null

  const greeting = greetingForNow()
  const age = agePhrase(currentChild.birthYearMonth)

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-clay-sm">
      <p className="flex items-center gap-1.5 text-sm font-medium text-text">
        <Icon name={greeting.icon} className="h-[16px] w-[16px] text-brand" />
        {greeting.text}，陪伴
        <span className="font-semibold text-brand-strong">{currentChild.nickname}</span>
        {age && <span className="text-muted">· {age}</span>}
      </p>

      {stats && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand-strong">
            <Icon name="heart" className="h-[13px] w-[13px]" />
            今天 {stats.todayCount} 次陪伴
          </span>
          {stats.streak > 1 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-tint px-2.5 py-1 text-xs font-medium text-warning">
              <Icon name="star" className="h-[13px] w-[13px]" />
              連續 {stats.streak} 天
            </span>
          )}
        </div>
      )}
    </section>
  )
}
