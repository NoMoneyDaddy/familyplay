'use client'

import { useEffect, useState } from 'react'
import { SettingsGearLink } from '@/app/components/settings-gear-link'
import { Icon } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

// 頂部低調的一條：左邊切換孩子（顯示完整暱稱、不截斷），右邊設定入口。
// 取代原本很突出的大框切換器，並把「設定」整合到每頁最上方。
export function ChildSwitcher() {
  const { selectedChildId, children, setSelectedChildId, setChildren, setHasHydrated } =
    useChildStore()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/children/list')
        if (res.ok) {
          const data = await res.json()
          setChildren(data.children || [])
        }
      } catch (error) {
        console.error('Failed to fetch children:', error)
      } finally {
        setLoading(false)
        setHasHydrated(true)
      }
    }

    fetchChildren()
  }, [mounted, setChildren, setHasHydrated])

  // 載入中也保留右上角設定入口（避免頂列閃動消失）
  const currentChild = mounted && !loading ? children.find((c) => c.id === selectedChildId) : null

  return (
    <div className="flex items-center justify-between gap-2">
      {currentChild ? (
        <label className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted">
          <Icon name="child" className="h-[18px] w-[18px] shrink-0 text-brand" />
          <span className="shrink-0">照顧</span>
          {/* 原生 select 依內容自適寬度（顯示完整暱稱）；過長才以 max-width 收斂 */}
          <select
            aria-label="切換孩子"
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="max-w-[52vw] cursor-pointer border-none bg-transparent pr-1 font-semibold text-brand-strong focus:outline-none"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nickname}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span aria-hidden="true" />
      )}
      <SettingsGearLink />
    </div>
  )
}
