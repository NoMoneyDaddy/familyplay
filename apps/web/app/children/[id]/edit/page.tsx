'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChildForm } from '@/app/components/child-form'
import { Button, EmptyState, PageHeader, PageShell } from '@/app/components/ui'

interface Child {
  id: string
  nickname: string
  birthYearMonth?: string
  birthDate?: string | null
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
      <PageShell>
        <PageHeader title="編輯孩子" backHref="/children" />
        {/* 骨架：先佔好表單卡片的位置，避免抓到孩子資料後版面跳動 */}
        <div
          className="animate-pulse space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-clay"
          aria-hidden="true"
        >
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-bg" />
            <div className="h-12 w-full rounded-lg bg-bg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-bg" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-lg bg-bg" />
              <div className="h-12 rounded-lg bg-bg" />
            </div>
          </div>
          <div className="h-12 w-full rounded-lg bg-bg" />
        </div>
        <span className="sr-only" role="status">
          載入中…
        </span>
      </PageShell>
    )
  }

  if (!child) {
    return (
      <PageShell>
        <PageHeader title="編輯孩子" backHref="/children" />
        <EmptyState
          title="找不到這個孩子"
          action={
            <Button variant="secondary" icon="back" onClick={() => router.push('/children')}>
              回到孩子列表
            </Button>
          }
        >
          這個檔案可能已被刪除，或連結不正確。
        </EmptyState>
      </PageShell>
    )
  }

  const [year, month] = (child.birthYearMonth || '').split('-')
  // 有完整生日就帶出「日」當預設；否則留空（只到月）
  const day = child.birthDate ? child.birthDate.split('-')[2] : ''

  const handleSuccess = () => {
    router.push('/children')
  }

  return (
    <PageShell>
      <PageHeader title="編輯孩子" subtitle={child.nickname} backHref="/children" />

      <ChildForm
        childId={childId}
        initialNickname={child.nickname}
        initialBirthYear={year || ''}
        initialBirthMonth={month || ''}
        initialBirthDay={day ? String(Number(day)) : ''}
        onSuccess={handleSuccess}
      />
    </PageShell>
  )
}
