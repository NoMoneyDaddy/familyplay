'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  EmptyState,
  ErrorAlert,
  Icon,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'

interface Child {
  id: string
  nickname: string
  birthYearMonth?: string
  stageKey?: string
  createdAt: string
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/children/list')
        if (res.ok) {
          const data = await res.json()
          setChildren(data.children || [])
        }
      } catch (error) {
        console.error('Failed to fetch children:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [])

  const handleDelete = async (childId: string) => {
    if (!confirm('確認要刪除這個孩子嗎？相關的陪伴紀錄會保留。')) {
      return
    }

    setDeleting(childId)
    setError(null)
    try {
      const res = await fetch(`/api/children/${childId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setChildren(children.filter((c) => c.id !== childId))
      } else {
        setError('刪除失敗，請重試')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setError('刪除失敗，請重試')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader title="管理孩子" subtitle="編輯和管理你的孩子檔案" />

      <ErrorAlert message={error} />

      {children.length === 0 ? (
        <EmptyState
          title="還沒有孩子檔案"
          action={
            <LinkButton href="/children/add" icon="plus">
              新增第一個孩子
            </LinkButton>
          }
        >
          建立孩子的檔案，波波就能依年齡與發展，給你今天最適合的陪伴方案。
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3">
            {children.map((child) => (
              <Card as="li" key={child.id} className="space-y-3 p-4">
                <div className="flex items-start gap-2">
                  <Icon name="child" className="mt-0.5 h-[18px] w-[18px] text-brand" />
                  <div className="flex-1">
                    <h2 className="font-semibold text-text">{child.nickname}</h2>
                    {child.birthYearMonth && (
                      <p className="text-sm text-muted">出生: {child.birthYearMonth}</p>
                    )}
                    {child.stageKey && (
                      <p className="mt-1 text-xs text-faint">階段: {child.stageKey}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <LinkButton
                    href={`/children/${child.id}/edit`}
                    size="md"
                    variant="secondary"
                    icon="edit"
                    className="flex-1"
                  >
                    編輯
                  </LinkButton>
                  <Button
                    size="md"
                    variant="danger"
                    icon="trash"
                    onClick={() => handleDelete(child.id)}
                    loading={deleting === child.id}
                    disabled={deleting === child.id}
                    className="flex-1"
                  >
                    刪除
                  </Button>
                </div>
              </Card>
            ))}
          </ul>

          <LinkButton href="/children/add" size="lg" icon="plus">
            新增孩子
          </LinkButton>
        </>
      )}

      <Callout tone="tip" title="和家人一起照顧">
        <p>邀請另一半、長輩或保母加入同一個家庭，一起查看孩子的資料與陪伴紀錄。</p>
        <LinkButton href="/settings/invite" variant="ghost" icon="family">
          邀請家人
        </LinkButton>
      </Callout>
    </PageShell>
  )
}
