import type { Metadata, Viewport } from 'next'
import { Baloo_2, Noto_Sans_TC } from 'next/font/google'
import Script from 'next/script'
import { BottomNav } from './components/bottom-nav'
import { InstallPrompt } from './components/install-prompt'
import { ServiceWorkerRegister } from './components/sw-register'
import './globals.css'

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
  display: 'swap',
})

// 圓潤 display 字體：給品牌字與大數字個性，刻意避開 Inter/Roboto 的 AI 預設感
const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-baloo',
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
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32.png',
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
    <html lang="zh-TW" className={`${notoSansTC.variable} ${baloo2.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ServiceWorkerRegister />
        {/* mobile-first 聚焦欄：手機滿版；平板/桌機置中並加環境陰影，框成「被設計過的 App」 */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-bg shadow-none sm:shadow-[0_0_90px_-28px_rgba(74,49,28,0.3)]">
          {children}
          {/* 常駐底部導覽：只在主要功能頁顯示，框出一致的「App」骨架 */}
          <BottomNav />
          {/* 安裝引導：能安裝時才浮出，引導加到主畫面（秒開＋離線） */}
          <InstallPrompt />
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
