import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://familyplay.zeabur.app'

// 登入後／需驗證的功能頁不需被索引（搜尋引擎抓到只會是登入轉址，浪費 crawl budget）；
// 公開頁（首頁、試用、定價、隱私等）開放。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: [
        '/api/',
        '/admin',
        '/now',
        '/select',
        '/recommendations',
        '/activity',
        '/history',
        '/saved',
        '/children',
        '/capabilities',
        '/settings',
        '/onboarding',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
