'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Child {
  id: string
  nickname: string
  birthYearMonth?: string
  stageKey?: string
  createdAt: string
}

export default function ChildrenPage() {
  const router = useRouter()
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
      <main className="min-h-screen bg-gradient-to-b from-bg to-white px-5 py-8">
        <div className="mx-auto max-w-[480px]">
          <div className="text-center text-muted" role="status">
            加載中...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-brand">管理孩子</h1>
          <p className="text-muted">編輯和管理你的孩子檔案</p>
        </div>

        {/* live region 常駐 DOM */}
        <div
          role="alert"
          className={error ? 'rounded-lg bg-red-50 p-3 text-sm text-red-700' : 'sr-only'}
        >
          {error}
        </div>

        {children.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center space-y-4">
            <p className="text-muted">還沒有孩子檔案</p>
            <Link
              href="/children/add"
              className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:opacity-90"
            >
              新增孩子
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="rounded-lg border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h2 className="font-semibold text-text">{child.nickname}</h2>
                    {child.birthYearMonth && (
                      <p className="text-sm text-muted">出生: {child.birthYearMonth}</p>
                    )}
                    {child.stageKey && (
                      <p className="text-xs text-muted mt-1">階段: {child.stageKey}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/children/${child.id}/edit`}
                      className="px-3 py-1 rounded-md bg-bg text-sm font-medium text-brand hover:bg-border"
                    >
                      編輯
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(child.id)}
                      disabled={deleting === child.id}
                      className="px-3 py-1 rounded-md bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleting === child.id ? '刪除中...' : '刪除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/children/add"
              className="block text-center rounded-lg bg-brand py-3 font-semibold text-white hover:opacity-90"
            >
              新增孩子
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
