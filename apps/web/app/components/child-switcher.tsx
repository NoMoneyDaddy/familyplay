'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

// 頂部低調的一條：切換孩子（顯示完整暱稱、不截斷）。
// 設定已移到底部導覽列，這條只保留孩子切換，頂部更清爽。
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

    // 快速切頁可能在 fetch 回來前卸載。全域 Zustand 操作（setChildren/setHasHydrated）
    // 卸載後更新仍安全且有益——資料快取在全域，回到此頁可免重打。只有本地 useState
    // （setLoading）才需要 cancelled 守衛，避免卸載後 setState 警告。
    let cancelled = false
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
        setHasHydrated(true)
        if (!cancelled) setLoading(false)
      }
    }

    fetchChildren()
    return () => {
      cancelled = true
    }
  }, [mounted, setChildren, setHasHydrated])

  // 載入中也保留右上角設定入口（避免頂列閃動消失）
  const currentChild = mounted && !loading ? children.find((c) => c.id === selectedChildId) : null

  if (!currentChild) return null

  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted">
        <Icon name="child" className="h-[18px] w-[18px] shrink-0 text-brand" />
        <span className="shrink-0">照顧</span>
        {/* 原生 select 依內容自適寬度（顯示完整暱稱）；過長才以 max-width 收斂 */}
        <select
          aria-label="切換孩子"
          value={selectedChildId || ''}
          onChange={(e) => setSelectedChildId(e.target.value)}
          className="max-w-[64vw] cursor-pointer border-none bg-transparent pr-1 font-semibold text-brand-strong focus:outline-none"
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.nickname}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
