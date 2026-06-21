'use client'

import { LegalLinks } from '@/app/components/legal-links'
import { Callout, Card, Icon, PageHeader, PageShell } from '@/app/components/ui'
import { useGoBack } from '@/lib/use-go-back'

/**
 * 「方案」頁——本 App 不收費。所有功能免費，靠頁面上少量、低干擾的廣告維持營運。
 * 保留此頁是為了對使用者誠實說明商業模式（與隱私/條款一致），無任何付費/升級入口。
 */
export default function PricingPage() {
  const goBack = useGoBack('/settings')

  return (
    <PageShell className="space-y-6">
      <PageHeader
        title="完全免費"
        subtitle="由少量、低干擾的廣告支持，沒有付費牆"
        onBack={goBack}
      />

      {/* 簽名區：暖色說明帶 */}
      <Card className="relative overflow-hidden border-brand/30 bg-brand-tint">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand opacity-10 blur-2xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[image:var(--gradient-brand)] shadow-brand">
            <Icon name="heart" className="h-6 w-6 text-white" />
          </span>
          <div className="space-y-1">
            <p className="font-bold text-text">所有功能都免費</p>
            <p className="text-sm leading-relaxed text-muted">
              一鍵陪伴、發展里程碑、成長紀錄、陪伴日誌、家庭共享、交接小卡——全部不收費，
              也沒有任何訂閱或解鎖。我們靠頁面上少量、非干擾式的廣告維持營運。
            </p>
          </div>
        </div>
      </Card>

      <ul className="space-y-2.5">
        {[
          '核心「30 秒陪伴方案」與完整活動庫，永久免費',
          '發展里程碑、成長紀錄、陪伴日誌與歷史，免費',
          '家庭共享與交接小卡，免費',
          'AI 客製活動：自帶 AI 金鑰即可用（金鑰只存在你的裝置，用完即丟）',
        ].map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-sm text-text">
            <Icon name="check" className="mt-0.5 h-[16px] w-[16px] shrink-0 text-success" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <Callout tone="info" title="關於廣告">
        廣告只出現在瀏覽型頁面（如紀錄、收藏）的底部，不會打斷你和孩子的陪伴流程，也不會用到孩子的個人資料。
      </Callout>

      <LegalLinks className="pt-2" />
    </PageShell>
  )
}
