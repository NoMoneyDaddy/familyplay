'use client'

import { useRouter } from 'next/navigation'
import { ChildForm } from '@/app/components/child-form'
import { PageHeader, PageShell } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

export default function OnboardingPage() {
  const router = useRouter()
  const { setSelectedChildId } = useChildStore()

  const handleSuccess = (child?: { nickname: string; childId?: string }) => {
    // 立刻把新孩子設為當前孩子，/now 才不會因為「尚未選孩子」而跳回引導頁
    if (child?.childId) {
      setSelectedChildId(child.childId)
    }
    // 建完直接進「現在就陪」一鍵頁，首次就拿到一個方案（而非再面對一張選擇表單）
    router.push('/now')
  }

  return (
    <PageShell withNav={false}>
      <PageHeader title="認識你的孩子" subtitle="讓我們為你準備最適合的陪伴方案" />

      <ChildForm onSuccess={handleSuccess} submitLabel="開始陪伴" />

      <p className="text-center text-xs text-muted">你可以之後新增更多孩子</p>
    </PageShell>
  )
}
