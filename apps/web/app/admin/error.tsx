'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button, PageShell } from '@/app/components/ui'

// 段層級錯誤邊界：render throw 只壞掉這一段，保留 app 導覽外殼而非冒泡到 root。
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <PageShell>
      <div className="space-y-4 py-16 text-center" role="alert">
        <div className="text-4xl">😵</div>
        <p className="text-text">儀表板載入失敗，問題已自動回報。</p>
        <Button onClick={reset} size="md" icon="refresh">
          重試
        </Button>
      </div>
    </PageShell>
  )
}
