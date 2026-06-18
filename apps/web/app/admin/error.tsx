'use client'

import * as Sentry from '@sentry/nextjs'
import { useRouter } from 'next/navigation'
import { startTransition, useEffect } from 'react'
import { Button, PageShell } from '@/app/components/ui'

// 段層級錯誤邊界：render throw 只壞掉這一段，保留 app 外殼而非冒泡到 root。
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  // admin/page 是 server component；單純 reset() 只會用已快取的錯誤 payload 重渲染，
  // 不會重打伺服器查詢。先 router.refresh() 重新取資料，再 reset 邊界。
  const handleReset = () => {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  // 與 admin/page 一致 withNav={false}，避免載入↔錯誤間的版面跳動。
  return (
    <PageShell withNav={false}>
      <div className="space-y-4 py-16 text-center" role="alert">
        <div className="text-4xl">😵</div>
        <p className="text-text">儀表板載入失敗，問題已自動回報。</p>
        <Button onClick={handleReset} size="md" icon="refresh">
          重試
        </Button>
      </div>
    </PageShell>
  )
}
