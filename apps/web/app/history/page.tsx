'use client'

import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { useChildStore } from '@/lib/stores/useChildStore'

interface Log {
  id: string
  activityTitle: string
  outcome: string
  childReaction: string
  createdAt: string
  durationSecs?: number
}

export default function HistoryPage() {
  const { selectedChildId } = useChildStore()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }

    fetch(`/api/logs?childId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [selectedChildId])

  const getOutcomeEmoji = (outcome: string) => {
    switch (outcome) {
      case 'completed':
        return '✅'
      case 'tried':
        return '⚡'
      case 'abandoned':
        return '⏸'
      default:
        return '📝'
    }
  }

  if (!selectedChildId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
        <div className="mx-auto max-w-[480px]">
          <div className="text-center text-[--color-muted]">加載中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <ChildSwitcher />
      <div className="mx-auto max-w-[480px] space-y-6 pt-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">陪伴紀錄</h1>
          <p className="text-[--color-muted]">回顧過去的親子時光</p>
        </div>

        {loading ? (
          <div className="text-center text-[--color-muted]">加載中...</div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-[--color-muted]">還沒有紀錄</p>
            <p className="text-xs text-[--color-muted]">完成活動後會顯示在這裡</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-[--color-text]">{log.activityTitle}</p>
                    <p className="text-xs text-[--color-muted]">
                      {new Date(log.createdAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <span className="text-2xl">{getOutcomeEmoji(log.outcome)}</span>
                </div>
                <div className="mt-2 flex gap-2 text-xs text-[--color-muted]">
                  <span>反應: {log.childReaction}</span>
                  {log.durationSecs && <span>• {Math.round(log.durationSecs / 60)} 分鐘</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
