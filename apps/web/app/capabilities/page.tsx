'use client'

import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { Icon, LinkButton, PageHeader, PageShell } from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useChildStore } from '@/lib/stores/useChildStore'
import { useGoBack } from '@/lib/use-go-back'

interface Capability {
  key: string
  label: string
  achieved: boolean
}

export default function CapabilitiesPage() {
  const { selectedChildId, hasHydrated } = useChildStore()
  const goBack = useGoBack('/history')
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchWithTimeout(`/api/capabilities?childId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => setCapabilities(data.capabilities || []))
      .catch(() => setCapabilities([]))
      .finally(() => setLoading(false))
  }, [selectedChildId])

  const achievedCount = capabilities.filter((c) => c.achieved).length

  return (
    <PageShell>
      {/* ChildSwitcher 一律掛載：它負責抓孩子清單並設定當前孩子 */}
      <ChildSwitcher />
      <PageHeader
        title="能力追蹤"
        subtitle={`${achievedCount} / ${capabilities.length} 已達成`}
        onBack={goBack}
      />

      {!hasHydrated ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : !selectedChildId ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-muted">還沒有孩子檔案</p>
          <LinkButton href="/children/add" icon="plus">
            新增孩子
          </LinkButton>
        </div>
      ) : loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : (
        <ul className="grid gap-2">
          {capabilities.map((cap) => (
            <li
              key={cap.key}
              className={`flex items-center justify-between rounded-lg border p-4 ${
                cap.achieved
                  ? 'border-transparent bg-success-tint text-success'
                  : 'border-border bg-bg text-muted'
              }`}
            >
              <span className="font-medium">{cap.label}</span>
              {cap.achieved ? (
                <Icon name="check" className="h-[20px] w-[20px]" />
              ) : (
                <span className="h-[18px] w-[18px] rounded-full border-2 border-border" />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-faint">基於陪伴活動和里程碑自動更新</p>
    </PageShell>
  )
}
