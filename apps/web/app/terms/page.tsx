import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, PageHeader, PageShell } from '@/app/components/ui'

const EFFECTIVE_DATE = '2026 年 6 月 18 日'

export const metadata: Metadata = {
  title: '服務條款 · FamilyPlay',
  description: 'FamilyPlay 的使用條款。',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-text">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <PageShell withNav={false} className="space-y-6">
      <PageHeader title="服務條款" subtitle={`最後更新：${EFFECTIVE_DATE}`} backHref="/settings" />

      <Card className="space-y-6">
        <Section title="1. 服務說明">
          <p>
            FamilyPlay（以下稱「本服務」）提供親子陪伴活動的<strong>建議</strong>
            與發展階段的一般性參考， 協助家長與照顧者安排親子互動。本服務
            <strong>非醫療或專業評估服務</strong>，詳見
            <Link href="/disclaimer" className="text-brand hover:underline">
              免責聲明
            </Link>
            。
          </p>
        </Section>

        <Section title="2. 帳號與資格">
          <p>
            你必須為<strong>成年人</strong>
            且為孩子的家長或合法照顧者，方能使用本服務並輸入孩子的相關資料。
            你需對帳號下的活動負責，並確保所提供的資訊正確。
          </p>
        </Section>

        <Section title="3. 可接受的使用">
          <ul className="list-disc space-y-1 pl-5">
            <li>不得將本服務用於任何違法用途。</li>
            <li>不得嘗試破壞、逆向工程或未經授權存取本服務或其他使用者的資料。</li>
            <li>不得濫用或大量自動化請求，以免影響服務運作。</li>
          </ul>
        </Section>

        <Section title="4. 付費與訂閱">
          <ul className="list-disc space-y-1 pl-5">
            <li>本服務大部分功能免費，並提供選擇性的付費方案。</li>
            <li>
              付費訂閱透過第三方金流（RevenueCat，行動端經 App Store／Google Play，網頁經 RevenueCat
              Web Billing）處理，並依其結帳流程進行。
            </li>
            <li>
              訂閱可隨時取消，並於當期結束後停止續扣；標示「即將推出」的功能在正式上線前不會收費。
            </li>
            <li>退款依適用法律與金流商政策辦理。</li>
          </ul>
        </Section>

        <Section title="5. 智慧財產權">
          <p>
            本服務的內容、活動文案、設計與軟體均受智慧財產權保護，未經授權不得重製、散布或作商業使用。
            你為自己輸入的資料保有權利。
          </p>
        </Section>

        <Section title="6. 免責與責任限制">
          <p>
            本服務以「現狀」提供，不保證內容完全正確、不中斷或無錯誤。在法律允許範圍內，
            對於使用本服務所生之任何損害，我們不負賠償責任。活動安全與適用性請見
            <Link href="/disclaimer" className="text-brand hover:underline">
              免責聲明
            </Link>
            。
          </p>
        </Section>

        <Section title="7. 服務變更與終止">
          <p>
            我們可能新增、修改或停止部分或全部功能，並可能因違反本條款而暫停或終止帳號。
            你也可以隨時於「設定」中刪除帳號。
          </p>
        </Section>

        <Section title="8. 準據法">
          <p>本條款以中華民國（台灣）法律為準據法。</p>
        </Section>

        <Section title="9. 聯絡我們">
          <p>對本條款有任何疑問，正式聯絡管道將於服務上線時於本頁公布。</p>
        </Section>
      </Card>
    </PageShell>
  )
}
