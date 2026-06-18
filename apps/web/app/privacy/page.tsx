import type { Metadata } from 'next'
import { Callout, Card, PageHeader, PageShell } from '@/app/components/ui'

// 聯絡信箱：請改成真實可收信的地址（個資法/AdSense/商店審核都要求有效聯絡管道）。
const CONTACT_EMAIL = 'support@familyplay.app'
const EFFECTIVE_DATE = '2026 年 6 月 18 日'

export const metadata: Metadata = {
  title: '隱私權政策 · FamilyPlay',
  description: 'FamilyPlay 如何蒐集、使用與保護你與孩子的資料。',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-text">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
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

      <Card className="space-y-6">
        <Section title="1. 我們蒐集哪些資料">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>帳號資料：</strong>使用 Google
              登入時的電子郵件、顯示名稱與大頭貼；或訪客模式的匿名識別碼。
            </li>
            <li>
              <strong>孩子檔案：</strong>你自行填寫的暱稱、出生年月、發展階段與能力標記。
            </li>
            <li>
              <strong>陪伴紀錄：</strong>你記錄的活動結果與孩子反應。
            </li>
            <li>
              <strong>使用與技術資料：</strong>
              裝置類型、概略使用行為與錯誤紀錄（用於改善服務與排除問題）。
            </li>
            <li>
              <strong>Cookie：</strong>僅用於維持登入狀態與必要功能。
            </li>
          </ul>
        </Section>

        <Section title="2. 我們如何使用這些資料">
          <ul className="list-disc space-y-1 pl-5">
            <li>提供個人化的陪伴活動建議與發展階段參考。</li>
            <li>保存並呈現你的孩子檔案與陪伴紀錄。</li>
            <li>維護服務安全、分析使用狀況以持續改善。</li>
            <li>處理付費訂閱（如你選擇付費方案）。</li>
          </ul>
        </Section>

        <Section title="3. AI 處理的特別說明">
          <p>
            當你使用 AI 相關功能時，我們<strong>只會傳送匿名化的資訊</strong>
            （如發展階段、能力標籤、家長精力狀態）。 我們
            <strong>絕不會把孩子的暱稱、生日或任何可識別身分的資料傳送給 AI 服務供應商</strong>， 且
            AI 請求結束後即釋放，不另存於 AI 供應商。
          </p>
        </Section>

        <Section title="4. 第三方服務（資料處理者）">
          <p>我們使用下列受信任的服務商協助營運，並僅在必要範圍內共享資料：</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong>：資料庫與帳號驗證（資料儲存）。
            </li>
            <li>
              <strong>Google</strong>：第三方登入。
            </li>
            <li>
              <strong>PostHog / Sentry</strong>：使用分析與錯誤監控。
            </li>
            <li>
              <strong>LemonSqueezy</strong>：付費訂閱金流（我們不會儲存你的信用卡資料）。
            </li>
            <li>
              <strong>Google AdSense</strong>：免費版可能顯示少量廣告（付費後移除）。
            </li>
          </ul>
        </Section>

        <Section title="5. 兒童資料">
          <p>
            本服務面向<strong>家長與照顧者</strong>
            使用，孩子的相關資料皆由你（成年監護人）自行輸入並掌控。
            我們不直接面向兒童蒐集資料。你可以隨時檢視、修改或刪除孩子檔案。
          </p>
        </Section>

        <Section title="6. 你的權利">
          <p>
            依《個人資料保護法》，你有權查詢、閱覽、補充、更正、要求停止使用或刪除你的個人資料：
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>在「設定 → 孩子」可編輯或刪除孩子檔案。</li>
            <li>在「設定」可刪除整個帳號，這會一併永久刪除你的所有相關資料。</li>
            <li>其他請求可來信 {CONTACT_EMAIL}。</li>
          </ul>
        </Section>

        <Section title="7. 資料保留與刪除">
          <p>
            我們僅在提供服務所需期間保留你的資料。當你刪除帳號時，系統會級聯刪除你的孩子檔案、陪伴紀錄、
            家庭與邀請等相關資料。部分匿名化的分析統計可能保留以供改善服務。
          </p>
        </Section>

        <Section title="8. 資料安全">
          <p>
            我們以資料列級安全（RLS）限制存取權限、以加密連線傳輸資料，並遵循最小權限原則。
            惟沒有任何系統能保證百分之百安全。
          </p>
        </Section>

        <Section title="9. 國際資料傳輸">
          <p>
            我們的服務商可能在台灣以外地區（如新加坡等）儲存與處理資料。使用本服務即表示你了解此情況。
          </p>
        </Section>

        <Section title="10. 政策變更">
          <p>我們可能不時更新本政策，重大變更會在 App 內或本頁公告，並更新上方「最後更新」日期。</p>
        </Section>

        <Section title="11. 聯絡我們">
          <p>對本政策或你的資料有任何疑問，請來信：{CONTACT_EMAIL}。</p>
        </Section>
      </Card>
    </PageShell>
  )
}
