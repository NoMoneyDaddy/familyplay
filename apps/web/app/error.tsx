'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

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
      <h1 className="text-xl font-bold text-[--color-text]">發生了一點問題</h1>
      <p className="text-sm text-[--color-muted]">請稍後再試，問題已自動回報給我們。</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-[--color-brand] px-5 py-2.5 font-medium text-white hover:opacity-90"
      >
        重試
      </button>
    </main>
  )
}
