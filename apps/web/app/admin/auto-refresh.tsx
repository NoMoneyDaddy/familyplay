'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// 每 intervalMs 重新整理 server component（router.refresh 會重抓資料），讓 dashboard 保持最新。
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [updatedAt, setUpdatedAt] = useState<string>('')

  useEffect(() => {
    setUpdatedAt(new Date().toLocaleTimeString('zh-TW'))
    const id = setInterval(() => {
      router.refresh()
      setUpdatedAt(new Date().toLocaleTimeString('zh-TW'))
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
      即時 · 每 {Math.round(intervalMs / 1000)} 秒更新{updatedAt && ` · ${updatedAt}`}
    </span>
  )
}
