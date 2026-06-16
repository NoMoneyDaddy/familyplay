'use client'

import { useChildStore } from '@/lib/stores/useChildStore'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Child {
  id: string
  nickname: string
  stageKey?: string
  birthYearMonth?: string
}

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
    <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[--color-border]">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[--color-muted]">現在照顧</span>
        {currentChild && (
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="text-lg font-semibold text-[--color-brand] bg-transparent border-none cursor-pointer focus:outline-none"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nickname}
              </option>
            ))}
          </select>
        )}
      </div>
      <Link href="/children" className="text-sm text-[--color-brand] hover:underline font-medium">
        編輯
      </Link>
    </div>
  )
}
