import type { Metadata } from 'next'

// pricing/page 因結帳按鈕需互動而為 client component，無法 export metadata
// → 整頁會繼承 root 的通用標題。用段層級 layout（server）補上正確的標題與描述。
export const metadata: Metadata = {
  title: '方案與支持 · FamilyPlay',
  description: '大部分功能免費（含少量廣告）；付費可移除廣告並解鎖進階功能，支持我們持續開發。',
  // 子路由覆寫 title/description 不會自動同步 openGraph；不補上的話社群分享
  // 仍顯示 root 的通用 OG 標題。明確指定，分享預覽才對得上頁面內容。
  openGraph: {
    title: '方案與支持 · FamilyPlay',
    description: '大部分功能免費（含少量廣告）；付費可移除廣告並解鎖進階功能，支持我們持續開發。',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
