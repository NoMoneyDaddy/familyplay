'use client'

import { useEffect, useState } from 'react'
import { SettingsGearLink } from '@/app/components/settings-gear-link'
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
import { stageLabel } from '@/lib/stage-labels'

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
        <PageHeader
          title="管理孩子"
          subtitle="編輯和管理你的孩子檔案"
          action={<SettingsGearLink />}
        />
        {/* 骨架：先佔好卡片位置，避免清單載入時版面跳動（CLS） */}
        <ul className="space-y-3" aria-hidden="true">
          {[0, 1].map((i) => (
            <li key={i} className="animate-pulse rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 shrink-0 rounded-[16px] bg-bg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-bg" />
                  <div className="h-3 w-16 rounded bg-bg" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-9 flex-1 rounded-lg bg-bg" />
                <div className="h-9 flex-1 rounded-lg bg-bg" />
              </div>
            </li>
          ))}
        </ul>
        <span className="sr-only" role="status">
          加載中...
        </span>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="管理孩子"
        subtitle="編輯和管理你的孩子檔案"
        action={<SettingsGearLink />}
      />

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
                <div className="flex items-center gap-3">
                  {/* 簽名強化：給每個孩子一個圓潤的品牌色頭像方塊，讓列表從「一排條目」
                      變成「一群孩子」，呼應黏土暖色調性、也提升可掃讀性。 */}
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-brand-tint text-brand shadow-clay-sm">
                    <Icon name="child" className="h-[22px] w-[22px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-text">{child.nickname}</h2>
                    {stageLabel(child.stageKey) ? (
                      <span className="mt-1 inline-flex items-center rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
                        {stageLabel(child.stageKey)}
                      </span>
                    ) : (
                      child.birthYearMonth && (
                        <p className="text-sm text-muted">出生：{child.birthYearMonth}</p>
                      )
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
