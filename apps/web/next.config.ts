import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // HTTP Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Google AdSense（輕度廣告）所需來源；未設定 AdSense 時不會載入這些腳本
              "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              'font-src fonts.gstatic.com',
              "img-src 'self' data: https:",
              "connect-src 'self' *.supabase.co *.googleapis.com generativelanguage.googleapis.com api.openai.com api.anthropic.com *.groq.com *.lemonsqueezy.com app.posthog.com *.sentry.io https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
              // 廣告以 iframe 呈現，需允許 Google 廣告框架來源
              'frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com',
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Images
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },

  // Zeabur 部署需要 standalone 輸出
  output: 'standalone',

  // Transpile shared packages
  transpilePackages: ['@familyplay/core', '@familyplay/ai', '@familyplay/db'],
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // @sentry/nextjs v10 移除 hideSourceMaps（source maps 上傳後預設即隱藏/刪除）。
  disableLogger: true,
  automaticVercelMonitors: false,
})
