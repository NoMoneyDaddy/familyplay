import * as Sentry from '@sentry/nextjs'

// Next.js loads server/edge Sentry config via the instrumentation hook.
// Without this file, sentry.server.config.ts and sentry.edge.config.ts never
// run, so backend/API errors (the entire current product surface) go
// unreported. See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures errors thrown in nested React Server Components (Sentry v8).
export const onRequestError = Sentry.captureRequestError
