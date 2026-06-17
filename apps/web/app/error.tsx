'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/app/components/ui'

export default function ErrorPage({
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">😵</div>
      <h1 className="text-xl font-bold text-text">發生了一點問題</h1>
      <p className="text-sm text-muted">請稍後再試，問題已自動回報給我們。</p>
      <Button onClick={reset} size="md" icon="refresh">
        重試
      </Button>
    </main>
  )
}
