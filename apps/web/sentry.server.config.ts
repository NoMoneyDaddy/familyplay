import * as Sentry from '@sentry/nextjs'

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key'])

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,

  beforeSend(event) {
    if (event.request?.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(
          ([key]) => !SENSITIVE_HEADERS.has(key.toLowerCase()),
        ),
      )
    }
    return event
  },
})
