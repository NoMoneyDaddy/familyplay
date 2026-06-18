'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button, LinkButton, PageShell } from '@/app/components/ui'

// 段層級錯誤邊界：活動頁 render throw 時保留外殼，給重試與回首頁的出口。
export default function ActivityError({
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
        <p className="text-text">這個活動載入時出了點問題，問題已自動回報。</p>
        <div className="flex flex-col items-center gap-2">
          <Button onClick={reset} size="md" icon="refresh">
            重試
          </Button>
          <LinkButton href="/select" variant="secondary" size="md">
            回首頁
          </LinkButton>
        </div>
      </div>
    </PageShell>
  )
}
