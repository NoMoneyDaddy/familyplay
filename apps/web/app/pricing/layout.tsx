import type { Metadata } from 'next'

// pricing/page 為 client component（用 useGoBack），無法 export metadata
// → 整頁會繼承 root 的通用標題。用段層級 layout（server）補上正確的標題與描述。
const TITLE = '完全免費 · FamilyPlay'
const DESCRIPTION = '所有功能永久免費、沒有付費牆，由少量、低干擾的廣告支持。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // 子路由覆寫 title/description 不會自動同步 openGraph；不補上的話社群分享
  // 仍顯示 root 的通用 OG 標題。明確指定，分享預覽才對得上頁面內容。
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
