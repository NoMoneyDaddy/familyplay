import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Icon, PageHeader, PageShell } from '@/app/components/ui'

const EFFECTIVE_DATE = '2026 年 6 月 18 日'

export const metadata: Metadata = {
  title: '服務條款 · FamilyPlay',
  description: 'FamilyPlay 的使用條款。',
}

const SECTIONS = [
  { id: 'service', label: '服務說明' },
  { id: 'account', label: '帳號與資格' },
  { id: 'acceptable-use', label: '可接受的使用' },
  { id: 'billing', label: '付費與訂閱' },
  { id: 'ip', label: '智慧財產權' },
  { id: 'liability', label: '免責與責任限制' },
  { id: 'termination', label: '服務變更與終止' },
  { id: 'law', label: '準據法' },
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

export default function TermsPage() {
  return (
    <PageShell withNav={false} className="space-y-6">
      <PageHeader title="服務條款" subtitle={`最後更新：${EFFECTIVE_DATE}`} backHref="/settings" />

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
        <Section index={1} id="service" title="服務說明">
          <p>
            FamilyPlay（以下稱「本服務」）提供親子陪伴活動的<strong>建議</strong>
            與發展階段的一般性參考， 協助家長與照顧者安排親子互動。本服務
            <strong>非醫療或專業評估服務</strong>，詳見
            <Link href="/disclaimer" className="font-medium text-brand hover:underline">
              免責聲明
            </Link>
            。
          </p>
        </Section>

        <Section index={2} id="account" title="帳號與資格">
          <p>
            你必須為<strong>成年人</strong>
            且為孩子的家長或合法照顧者，方能使用本服務並輸入孩子的相關資料。
            你需對帳號下的活動負責，並確保所提供的資訊正確。
          </p>
        </Section>

        <Section index={3} id="acceptable-use" title="可接受的使用">
          <ClauseList>
            <ClauseItem>不得將本服務用於任何違法用途。</ClauseItem>
            <ClauseItem>不得嘗試破壞、逆向工程或未經授權存取本服務或其他使用者的資料。</ClauseItem>
            <ClauseItem>不得濫用或大量自動化請求，以免影響服務運作。</ClauseItem>
          </ClauseList>
        </Section>

        <Section index={4} id="billing" title="付費與訂閱">
          <ClauseList>
            <ClauseItem>本服務大部分功能免費，並提供選擇性的付費方案。</ClauseItem>
            <ClauseItem>
              付費訂閱透過第三方金流（RevenueCat，行動端經 App Store／Google Play，網頁經 RevenueCat
              Web Billing）處理，並依其結帳流程進行。
            </ClauseItem>
            <ClauseItem>
              訂閱可隨時取消，並於當期結束後停止續扣；標示「即將推出」的功能在正式上線前不會收費。
            </ClauseItem>
            <ClauseItem>退款依適用法律與金流商政策辦理。</ClauseItem>
          </ClauseList>
        </Section>

        <Section index={5} id="ip" title="智慧財產權">
          <p>
            本服務的內容、活動文案、設計與軟體均受智慧財產權保護，未經授權不得重製、散布或作商業使用。
            你為自己輸入的資料保有權利。
          </p>
        </Section>

        <Section index={6} id="liability" title="免責與責任限制">
          <p>
            本服務以「現狀」提供，不保證內容完全正確、不中斷或無錯誤。在法律允許範圍內，
            對於使用本服務所生之任何損害，我們不負賠償責任。活動安全與適用性請見
            <Link href="/disclaimer" className="font-medium text-brand hover:underline">
              免責聲明
            </Link>
            。
          </p>
        </Section>

        <Section index={7} id="termination" title="服務變更與終止">
          <p>
            我們可能新增、修改或停止部分或全部功能，並可能因違反本條款而暫停或終止帳號。
            你也可以隨時於「設定」中刪除帳號。
          </p>
        </Section>

        <Section index={8} id="law" title="準據法">
          <p>本條款以中華民國（台灣）法律為準據法。</p>
        </Section>

        <Section index={9} id="contact" title="聯絡我們">
          <p>對本條款有任何疑問，正式聯絡管道將於服務上線時於本頁公布。</p>
        </Section>
      </Card>
    </PageShell>
  )
}
