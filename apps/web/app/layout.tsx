import type { Metadata, Viewport } from 'next'
import { DM_Sans, Noto_Sans_TC } from 'next/font/google'
import { ServiceWorkerRegister } from './components/sw-register'
import './globals.css'

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
      <body className="min-h-screen bg-[--color-bg] font-sans antialiased">
        <ServiceWorkerRegister />
        <div className="mx-auto max-w-[480px] min-h-screen">{children}</div>
      </body>
    </html>
  )
}
