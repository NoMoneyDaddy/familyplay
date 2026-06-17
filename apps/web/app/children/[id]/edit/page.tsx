'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChildForm } from '@/app/components/child-form'
import { Button, PageHeader, PageShell } from '@/app/components/ui'

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
      <PageShell>
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      </PageShell>
    )
  }

  if (!child) {
    return (
      <PageShell>
        <div className="space-y-4 text-center">
          <p className="text-muted">找不到這個孩子</p>
          <Button variant="ghost" onClick={() => router.push('/children')}>
            返回
          </Button>
        </div>
      </PageShell>
    )
  }

  const [year, month] = (child.birthYearMonth || '').split('-')

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
        onSuccess={handleSuccess}
      />
    </PageShell>
  )
}
