'use client'

import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { useChildStore } from '@/lib/stores/useChildStore'

interface Capability {
  key: string
  label: string
  achieved: boolean
}

export default function CapabilitiesPage() {
  const { selectedChildId } = useChildStore()
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }

    fetch(`/api/capabilities?childId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => setCapabilities(data.capabilities || []))
      .catch(() => setCapabilities([]))
      .finally(() => setLoading(false))
  }, [selectedChildId])

  const achievedCount = capabilities.filter((c) => c.achieved).length

  if (!selectedChildId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-bg to-white px-5 py-8">
        <div className="mx-auto max-w-[480px]">
          <div className="text-center text-muted" role="status">
            加載中...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg to-white px-5 py-8">
      <ChildSwitcher />
      <div className="mx-auto max-w-[480px] space-y-6 pt-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-brand">能力追踪</h1>
          <p className="text-muted">
            {achievedCount} / {capabilities.length} 已達成
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted" role="status">
            加載中...
          </div>
        ) : (
          <div className="grid gap-2">
            {capabilities.map((cap) => (
              <div
                key={cap.key}
                className={`rounded-lg p-4 ${
                  cap.achieved ? 'bg-green-50 text-green-700' : 'bg-white text-text'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{cap.label}</span>
                  <span className="text-xl">{cap.achieved ? '✅' : '⭕'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted">基於陪伴活動和里程碑自動更新</p>
      </div>
    </main>
  )
}
