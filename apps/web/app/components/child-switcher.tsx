'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

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

  if (!mounted || loading) {
    return null
  }

  const currentChild = children.find((c) => c.id === selectedChildId)

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-3">
      <span className="shrink-0 whitespace-nowrap text-xs text-muted">現在照顧</span>
      {currentChild && (
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5">
          <Icon name="child" className="h-[16px] w-[16px] shrink-0 text-brand" />
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="min-w-0 flex-1 cursor-pointer truncate border-none bg-transparent text-base font-semibold text-brand focus:outline-none"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nickname}
              </option>
            ))}
          </select>
        </span>
      )}
      <Link
        href="/children"
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-brand transition-colors hover:text-brand-strong"
      >
        <Icon name="edit" className="h-[16px] w-[16px]" />
        編輯
      </Link>
    </div>
  )
}
