'use client'

import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { Card, Icon, type IconName, LinkButton, PageHeader, PageShell } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

interface Log {
  id: string
  activityTitle: string
  outcome: string
  childReaction: string
  createdAt: string
  durationSecs?: number
}

const OUTCOME_BADGE: Record<string, { icon: IconName; wrap: string }> = {
  completed: { icon: 'check', wrap: 'bg-success-tint text-success' },
  tried: { icon: 'today', wrap: 'bg-brand-tint text-brand-strong' },
  abandoned: { icon: 'clock', wrap: 'bg-warning-tint text-warning' },
  default: { icon: 'edit', wrap: 'bg-bg text-muted' },
}

export default function HistoryPage() {
  const { selectedChildId, hasHydrated } = useChildStore()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/logs?childId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [selectedChildId])

  return (
    <PageShell>
      {/* ChildSwitcher 一律掛載：它負責抓孩子清單並設定當前孩子 */}
      <ChildSwitcher />
      <PageHeader title="陪伴紀錄" subtitle="回顧過去的親子時光" />

      {!hasHydrated ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : !selectedChildId ? (
        <Card className="space-y-4 text-center">
          <p className="text-muted">還沒有孩子檔案</p>
          <LinkButton href="/children/add" icon="plus">
            新增孩子
          </LinkButton>
        </Card>
      ) : loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : logs.length === 0 ? (
        <Card className="text-center">
          <p className="text-muted">還沒有紀錄</p>
          <p className="text-xs text-faint">完成活動後會顯示在這裡</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => {
            const badge = OUTCOME_BADGE[log.outcome] ?? OUTCOME_BADGE.default
            return (
              <Card key={log.id} as="li" className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-text">{log.activityTitle}</p>
                    <p className="text-xs text-muted">
                      {new Date(log.createdAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <span
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${badge.wrap}`}
                  >
                    <Icon name={badge.icon} className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <div className="mt-2 flex gap-2 text-xs text-muted">
                  <span>反應: {log.childReaction}</span>
                  {log.durationSecs && <span>• {Math.round(log.durationSecs / 60)} 分鐘</span>}
                </div>
              </Card>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
