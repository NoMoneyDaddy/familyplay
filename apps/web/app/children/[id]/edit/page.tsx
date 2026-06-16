'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChildForm } from '@/app/components/child-form'

interface Child {
  id: string
  nickname: string
  birthYearMonth?: string
}

export default function EditChildPage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChild = async () => {
      try {
        const res = await fetch('/api/children/list')
        if (res.ok) {
          const data = await res.json()
          const foundChild = data.children?.find((c: Child) => c.id === childId)
          if (foundChild) {
            setChild(foundChild)
          }
        }
      } catch (error) {
        console.error('Failed to fetch child:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChild()
  }, [childId])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
        <div className="mx-auto max-w-[480px]">
          <div className="text-center text-[--color-muted]">加載中...</div>
        </div>
      </main>
    )
  }

  if (!child) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
        <div className="mx-auto max-w-[480px] text-center">
          <p className="text-[--color-muted]">找不到這個孩子</p>
          <button
            onClick={() => router.push('/children')}
            className="mt-4 text-[--color-brand] hover:underline font-medium"
          >
            返回
          </button>
        </div>
      </main>
    )
  }

  const [year, month] = (child.birthYearMonth || '').split('-')

  const handleSuccess = () => {
    router.push('/children')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6 pt-4">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">編輯孩子</h1>
          <p className="text-[--color-muted]">{child.nickname}</p>
        </div>

        <ChildForm
          childId={childId}
          initialNickname={child.nickname}
          initialBirthYear={year || ''}
          initialBirthMonth={month || ''}
          onSuccess={handleSuccess}
        />

        <p className="text-center text-xs text-[--color-muted]">
          <button
            onClick={() => router.back()}
            className="text-[--color-brand] hover:underline font-medium"
          >
            返回
          </button>
        </p>
      </div>
    </main>
  )
}
