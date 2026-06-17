'use client'

import { useRouter } from 'next/navigation'
import { ChildForm } from '@/app/components/child-form'

export default function AddChildPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/children')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6 pt-4">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-brand">新增孩子</h1>
          <p className="text-muted">讓我們認識你的孩子</p>
        </div>

        <ChildForm onSuccess={handleSuccess} />

        <p className="text-center text-xs text-muted">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-brand hover:underline font-medium"
          >
            返回
          </button>
        </p>
      </div>
    </main>
  )
}
