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
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' *.supabase.co *.googleapis.com generativelanguage.googleapis.com api.openai.com api.anthropic.com *.groq.com *.lemonsqueezy.com app.posthog.com *.sentry.io",
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
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // Transpile shared packages
  transpilePackages: [
    '@familyplay/core',
    '@familyplay/ai',
    '@familyplay/db',
  ],
}

export default nextConfig
