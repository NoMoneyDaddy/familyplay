'use client'

import { useRouter } from 'next/navigation'
import { ChildForm } from '@/app/components/child-form'
import { Mascot } from '@/app/components/mascot'
import { Icon, PageShell } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

// 簽名強化：把第一次見面做成「波波打招呼」的暖場——
// 居中的吉祥物徽章 + 一句歡迎，再帶出三個 30 秒就能拿到方案的承諾，
// 讓 onboarding 的第一印象是品牌與溫度，而不是一張光禿禿的表單。
const PROMISES = [
  '依年齡與發展階段挑活動',
  '一鍵就有可立即執行的方案',
  '只記錄年月，不存完整生日',
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const { setSelectedChildId } = useChildStore()

  const handleSuccess = (child?: { nickname: string; childId?: string }) => {
    // 立刻把新孩子設為當前孩子，/now 才不會因為「尚未選孩子」而跳回引導頁
    if (child?.childId) {
      setSelectedChildId(child.childId)
    }
    // 建完直接進「現在就陪」一鍵頁，首次就拿到一個方案（而非再面對一張選擇表單）。
    // 用 replace：引導是一次性流程，按返回鍵不該回到 onboarding 表單。
    router.replace('/now')
  }

  return (
    <PageShell withNav={false}>
      <header className="flex flex-col items-center text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-[30px] bg-brand-tint shadow-clay-sm">
          <Mascot className="h-16 w-16" />
        </span>
        <h1 className="mt-4 text-[28px] font-bold leading-tight text-text">認識你的孩子</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          波波先認識他，就能為你準備最適合的陪伴方案
        </p>
        <ul className="mt-5 w-full space-y-2 text-left">
          {PROMISES.map((text) => (
            <li key={text} className="flex items-center gap-2.5 text-sm text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-tint text-success">
                <Icon name="check" className="h-[13px] w-[13px]" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </header>

      <ChildForm onSuccess={handleSuccess} submitLabel="開始陪伴" />

      <p className="text-center text-xs text-muted">你可以之後新增更多孩子</p>
    </PageShell>
  )
}
