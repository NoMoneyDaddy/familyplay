'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Catches errors in the root layout itself. Must render its own <html>/<body>.
export default function GlobalError({
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
    <html lang="zh-TW">
      <body className="min-h-screen bg-[#FAFAF8] antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-5xl">😵</div>
          <h1 className="text-xl font-bold">應用程式發生錯誤</h1>
          <p className="text-sm text-gray-500">請重新整理頁面，問題已自動回報。</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#FF6B35] px-5 py-2.5 font-medium text-white"
          >
            重試
          </button>
        </main>
      </body>
    </html>
  )
}
