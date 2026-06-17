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
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          backgroundColor: '#FBF7F0',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '0 1.5rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#3D3A36',
          }}
        >
          <div style={{ fontSize: '3rem' }}>😵</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>應用程式發生錯誤</h1>
          <p style={{ fontSize: '0.875rem', color: '#8A847B', margin: 0 }}>
            請重新整理頁面，問題已自動回報。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#E8742C',
              padding: '0.625rem 1.25rem',
              fontWeight: 500,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            重試
          </button>
        </main>
      </body>
    </html>
  )
}
