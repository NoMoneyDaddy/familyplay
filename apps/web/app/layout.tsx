import type { Metadata, Viewport } from 'next'
import { DM_Sans, Noto_Sans_TC } from 'next/font/google'
import Script from 'next/script'
import { ServiceWorkerRegister } from './components/sw-register'
import './globals.css'

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FamilyPlay — 30 秒找到今天的陪伴方式',
  description: '給疲憊家長的親子陪伴導航。選你現在的狀態，立刻拿到可以開始的陪伴方案。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FamilyPlay',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'FamilyPlay',
    description: '給疲憊家長的親子陪伴導航',
    type: 'website',
    locale: 'zh_TW',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale/userScalable lock — users must be able to zoom (WCAG 1.4.4).
  themeColor: '#FF6B35',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={`${notoSansTC.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ServiceWorkerRegister />
        {/* mobile-first 聚焦欄：手機滿版；平板/桌機置中並加環境陰影，框成「被設計過的 App」 */}
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-bg shadow-none sm:shadow-[0_0_90px_-28px_rgba(74,49,28,0.3)]">
          {children}
        </div>
        {/* 輕度廣告：僅在設定 AdSense client 時載入腳本（未設定則完全不載入） */}
        {adsenseClient && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="lazyOnload"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        )}
      </body>
    </html>
  )
}
