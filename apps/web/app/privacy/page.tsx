import type { Metadata } from 'next'
import { Callout, Card, Icon, PageHeader, PageShell } from '@/app/components/ui'

const EFFECTIVE_DATE = '2026 年 6 月 18 日'

export const metadata: Metadata = {
  title: '隱私權政策 · FamilyPlay',
  description: 'FamilyPlay 如何蒐集、使用與保護你與孩子的資料。',
}

const SECTIONS = [
  { id: 'collect', label: '我們蒐集哪些資料' },
  { id: 'use', label: '我們如何使用這些資料' },
  { id: 'ai', label: 'AI 處理的特別說明' },
  { id: 'third-party', label: '第三方服務（資料處理者）' },
  { id: 'children', label: '兒童資料' },
  { id: 'rights', label: '你的權利' },
  { id: 'retention', label: '資料保留與刪除' },
  { id: 'security', label: '資料安全' },
  { id: 'transfer', label: '國際資料傳輸' },
  { id: 'changes', label: '政策變更' },
  { id: 'contact', label: '聯絡我們' },
] as const

/** 法律條款是真正有序的內容，編號標記在此承載「第幾條」的資訊，不是裝飾。 */
function Section({
  index,
  id,
  title,
  children,
}: {
  index: number
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-2.5">
      <h2 className="flex items-baseline gap-3 font-semibold text-text">
        <span className="font-display text-sm font-bold tabular-nums text-brand-strong">
          {String(index).padStart(2, '0')}
        </span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3 pl-[2.1rem] text-[15px] leading-[1.85] text-muted [&_strong]:font-semibold [&_strong]:text-text">
        {children}
      </div>
    </section>
  )
}

/** 條款內清單：以品牌色的鉤點取代灰圓點，讀起來更有引導感。 */
function ClauseList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2">{children}</ul>
}

function ClauseItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon name="check" className="mt-1 h-[15px] w-[15px] shrink-0 text-brand" />
      <span>{children}</span>
    </li>
  )
}

export default function PrivacyPage() {
  return (
    <PageShell withNav={false} className="space-y-6">
      <PageHeader
        title="隱私權政策"
        subtitle={`最後更新：${EFFECTIVE_DATE}`}
        backHref="/settings"
      />

      <Callout tone="info" title="重點摘要">
        我們只蒐集提供服務必要的資料；<strong>絕不把孩子的暱稱或生日傳給 AI 服務</strong>；
        不販售你的個人資料；你可以隨時在「設定」中刪除帳號與所有資料。
      </Callout>

      <nav aria-label="章節導覽">
        <Card className="space-y-2.5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">本頁內容</p>
          <ol className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group flex items-baseline gap-3 rounded-md py-0.5 text-sm text-muted transition-colors hover:text-brand-strong focus-visible:text-brand-strong focus-visible:outline-none"
                >
                  <span className="font-display text-xs font-bold tabular-nums text-faint group-hover:text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="group-hover:underline">{s.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </Card>
      </nav>

      <Card className="space-y-8">
        <Section index={1} id="collect" title="我們蒐集哪些資料">
          <ClauseList>
            <ClauseItem>
              <strong>帳號資料：</strong>使用 Google
              登入時的電子郵件、顯示名稱與大頭貼；或訪客模式的匿名識別碼。
            </ClauseItem>
            <ClauseItem>
              <strong>孩子檔案：</strong>你自行填寫的暱稱、出生年月、發展階段與能力標記。
            </ClauseItem>
            <ClauseItem>
              <strong>陪伴紀錄：</strong>你記錄的活動結果與孩子反應。
            </ClauseItem>
            <ClauseItem>
              <strong>使用與技術資料：</strong>
              裝置類型、概略使用行為與錯誤紀錄（用於改善服務與排除問題）。
            </ClauseItem>
            <ClauseItem>
              <strong>Cookie：</strong>僅用於維持登入狀態與必要功能。
            </ClauseItem>
          </ClauseList>
        </Section>

        <Section index={2} id="use" title="我們如何使用這些資料">
          <ClauseList>
            <ClauseItem>提供個人化的陪伴活動建議與發展階段參考。</ClauseItem>
            <ClauseItem>保存並呈現你的孩子檔案與陪伴紀錄。</ClauseItem>
            <ClauseItem>維護服務安全、分析使用狀況以持續改善。</ClauseItem>
            <ClauseItem>處理付費訂閱（如你選擇付費方案）。</ClauseItem>
          </ClauseList>
        </Section>

        <Section index={3} id="ai" title="AI 處理的特別說明">
          <p>
            當你使用 AI 相關功能時，我們<strong>只會傳送匿名化的資訊</strong>
            （如發展階段、能力標籤、家長精力狀態）。 我們
            <strong>絕不會把孩子的暱稱、生日或任何可識別身分的資料傳送給 AI 服務供應商</strong>， 且
            AI 請求結束後即釋放，不另存於 AI 供應商。
          </p>
        </Section>

        <Section index={4} id="third-party" title="第三方服務（資料處理者）">
          <p>我們使用下列受信任的服務商協助營運，並僅在必要範圍內共享資料：</p>
          <ClauseList>
            <ClauseItem>
              <strong>Supabase</strong>：資料庫與帳號驗證（資料儲存）。
            </ClauseItem>
            <ClauseItem>
              <strong>Google</strong>：第三方登入。
            </ClauseItem>
            <ClauseItem>
              <strong>PostHog / Sentry</strong>：使用分析與錯誤監控。
            </ClauseItem>
            <ClauseItem>
              <strong>RevenueCat</strong>：付費訂閱金流（行動端經 App Store／Google Play，網頁經
              RevenueCat Web Billing；我們不會儲存你的信用卡資料）。
            </ClauseItem>
            <ClauseItem>
              <strong>Google AdSense</strong>：免費版可能顯示少量廣告（付費後移除）。
            </ClauseItem>
          </ClauseList>
        </Section>

        <Section index={5} id="children" title="兒童資料">
          <p>
            本服務面向<strong>家長與照顧者</strong>
            使用，孩子的相關資料皆由你（成年監護人）自行輸入並掌控。
            我們不直接面向兒童蒐集資料。你可以隨時檢視、修改或刪除孩子檔案。
          </p>
        </Section>

        <Section index={6} id="rights" title="你的權利">
          <p>
            依《個人資料保護法》，你有權查詢、閱覽、補充、更正、要求停止使用或刪除你的個人資料：
          </p>
          <ClauseList>
            <ClauseItem>在「設定 → 孩子」可編輯或刪除孩子檔案。</ClauseItem>
            <ClauseItem>在「設定」可刪除整個帳號，這會一併永久刪除你的所有相關資料。</ClauseItem>
            <ClauseItem>
              其他請求可透過 App 內「設定」操作；正式聯絡管道將於服務上線時公布。
            </ClauseItem>
          </ClauseList>
        </Section>

        <Section index={7} id="retention" title="資料保留與刪除">
          <p>
            我們僅在提供服務所需期間保留你的資料。當你刪除帳號時，系統會級聯刪除你的孩子檔案、陪伴紀錄、
            家庭與邀請等相關資料。部分匿名化的分析統計可能保留以供改善服務。
          </p>
        </Section>

        <Section index={8} id="security" title="資料安全">
          <p>
            我們以資料列級安全（RLS）限制存取權限、以加密連線傳輸資料，並遵循最小權限原則。
            惟沒有任何系統能保證百分之百安全。
          </p>
        </Section>

        <Section index={9} id="transfer" title="國際資料傳輸">
          <p>
            我們的服務商可能在台灣以外地區（如新加坡等）儲存與處理資料。使用本服務即表示你了解此情況。
          </p>
        </Section>

        <Section index={10} id="changes" title="政策變更">
          <p>我們可能不時更新本政策，重大變更會在 App 內或本頁公告，並更新上方「最後更新」日期。</p>
        </Section>

        <Section index={11} id="contact" title="聯絡我們">
          <p>
            你可隨時於 App
            內「設定」檢視、修改或刪除你的資料。正式的聯絡管道將於服務上線時於本頁公布。
          </p>
        </Section>
      </Card>
    </PageShell>
  )
}
