import type { Metadata } from 'next'
import { Callout, Card, Icon, PageHeader, PageShell } from '@/app/components/ui'

const EFFECTIVE_DATE = '2026 年 6 月 18 日'

export const metadata: Metadata = {
  title: '免責聲明 · FamilyPlay',
  description: 'FamilyPlay 提供的活動與發展資訊僅供一般親子陪伴參考，非醫療或專業評估。',
}

const SECTIONS = [
  { id: 'non-medical', label: '非醫療與非專業評估' },
  { id: 'no-diagnosis', label: '不應用於診斷' },
  { id: 'consult', label: '有疑慮請諮詢專業人員' },
  { id: 'safety', label: '活動安全由家長負責' },
  { id: 'liability', label: '責任限制' },
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

export default function DisclaimerPage() {
  return (
    <PageShell withNav={false} className="space-y-6">
      <PageHeader title="免責聲明" subtitle={`最後更新：${EFFECTIVE_DATE}`} backHref="/settings" />

      <Callout tone="warning" title="請先閱讀">
        FamilyPlay 提供的活動建議與發展資訊
        <strong>僅供一般親子陪伴參考，並非醫療、診斷或專業發展評估</strong>，
        不能取代兒科醫師或專業人員的判斷。
      </Callout>

      <nav aria-label="章節導覽">
        <Card className="space-y-2.5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">本頁內容</p>
          <ol className="space-y-1">
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
        <Section index={1} id="non-medical" title="非醫療與非專業評估">
          <p>
            本服務提供的所有活動建議、發展階段說明與「能力追蹤」資訊，皆為
            <strong>簡化的一般性參考</strong>， 目的在於協助親子互動與陪伴。它們
            <strong>不是</strong>醫療建議、診斷、治療，也<strong>不是</strong>
            由臨床專業人員進行的發展評估，<strong>不能取代</strong>
            兒科醫師、臨床心理師、職能治療師、語言治療師、 物理治療師等專業人員的評估與建議。
          </p>
        </Section>

        <Section index={2} id="no-diagnosis" title="不應用於診斷">
          <p>
            App 中的發展階段與能力標記是依年齡的一般性參考範圍，
            <strong>個別孩子的發展速度差異很大</strong>， 符合或未符合某項參考
            <strong>都不代表</strong>孩子發展正常或異常。請勿以本服務的內容自行判斷或診斷
            發展遲緩、障礙或任何健康狀況。
          </p>
        </Section>

        <Section index={3} id="consult" title="有疑慮請諮詢專業人員">
          <p>
            若你對孩子的發展、健康、情緒或行為有任何疑慮，請諮詢合格的兒科醫師或專業人員。
            <strong>遇到緊急或危及健康的狀況，請立即就醫或撥打緊急電話。</strong>
          </p>
        </Section>

        <Section index={4} id="safety" title="活動安全由家長負責">
          <p>進行任何活動時，請務必：</p>
          <ClauseList>
            <ClauseItem>
              由成人<strong>全程在旁監護</strong>，不可讓孩子單獨進行。
            </ClauseItem>
            <ClauseItem>依孩子的實際年齡與能力調整，注意周遭環境安全。</ClauseItem>
            <ClauseItem>
              特別留意<strong>窒息風險</strong>（小零件、繩線）、跌落、過敏、食物與水的安全等。
            </ClauseItem>
            <ClauseItem>若孩子表現不適或抗拒，請立即停止。</ClauseItem>
          </ClauseList>
          <p>你需自行判斷活動是否適合你的孩子，並為活動過程中的安全負責。</p>
        </Section>

        <Section index={5} id="liability" title="責任限制">
          <p>
            在法律允許的最大範圍內，對於因使用或信賴本服務內容所導致的任何直接或間接損害，
            FamilyPlay 與其開發者不承擔責任。使用本服務即表示你已了解並接受上述限制。
          </p>
        </Section>

        <Section index={6} id="contact" title="聯絡我們">
          <p>對本聲明有任何疑問，正式聯絡管道將於服務上線時於本頁公布。</p>
        </Section>
      </Card>
    </PageShell>
  )
}
