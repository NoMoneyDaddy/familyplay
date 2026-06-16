'use client'

import { ChildForm } from '@/app/components/child-form'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/select')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6 pt-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">認識你的孩子</h1>
          <p className="text-[--color-muted]">讓我們為你準備最適合的陪伴方案</p>
        </div>

        <ChildForm onSuccess={handleSuccess} />

        <p className="text-center text-xs text-[--color-muted]">你可以之後新增更多孩子</p>
      </div>
    </main>
  )
}
