'use client'

import type { SavedEntry } from '@familyplay/data'
import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import {
  ActivityMeta,
  Card,
  EmptyState,
  Icon,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useChildStore } from '@/lib/stores/useChildStore'

// 形狀已由 /api/saved（@familyplay/data 的 fetchSaved/mapSavedRow）映射好，前端直接消費。
type SavedActivity = SavedEntry

/** 載入骨架：與收藏卡同形狀的脈動占位，避免「加載中…」文字造成版面突跳。 */
function SavedSkeleton() {
  return (
    <ul className="space-y-3" role="status" aria-label="載入中">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="animate-pulse space-y-3 rounded-xl border border-border/60 bg-card p-6 shadow-clay-sm"
        >
          <div className="h-5 w-3/4 rounded-full bg-bg" />
          <div className="flex gap-1.5">
            <div className="h-5 w-16 rounded-full bg-bg" />
            <div className="h-5 w-14 rounded-full bg-bg" />
          </div>
          <div className="h-10 w-full rounded-lg bg-bg" />
        </li>
      ))}
      <span className="sr-only">加載中...</span>
    </ul>
  )
}

export default function SavedPage() {
  const [items, setItems] = useState<SavedActivity[] | null>(null)
  // 帶上目前孩子，否則活動頁缺 childId 會擋下「記一下」，收藏變成死路。
  // 用 selector 只訂閱 selectedChildId，避免 store 其他欄位變動就整頁重繪。
  const selectedChildId = useChildStore((s) => s.selectedChildId)

  useEffect(() => {
    let cancelled = false
    fetchWithTimeout('/api/saved')
      .then((res) => (res.ok ? res.json() : { saved: [] }))
      .then((data) => {
        if (cancelled) return
        setItems((data.saved ?? []) as SavedActivity[])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageShell>
      {/* 掛載 ChildSwitcher 以抓孩子清單並設定當前孩子，確保活動連結能帶上 childId */}
      <ChildSwitcher />
      <PageHeader title="我的收藏" subtitle="存下喜歡的活動，想玩時 2 下就找到" />

      {items === null ? (
        <SavedSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="還沒有收藏"
          action={
            <LinkButton href="/now" icon="compass">
              找個活動來玩
            </LinkButton>
          }
        >
          在任何活動頁點愛心 ♥，就會收進這裡，之後不用重跑流程也找得到。
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {/* 收藏數小計：給「我的小書架」一點份量感，掃一眼就知道存了多少 */}
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Icon name="heart" className="h-[15px] w-[15px] text-brand" />
            收藏了 <strong className="font-semibold text-text">{items.length}</strong> 個活動
          </p>
          <ul className="space-y-3">
            {items.map((a) => (
              <Card
                as="li"
                key={a.activityId}
                className="space-y-3 transition-transform duration-150 hover:-translate-y-0.5"
              >
                <h2 className="text-lg font-semibold leading-snug text-text">{a.title}</h2>
                <ActivityMeta
                  developmentalFocus={a.developmentalFocus}
                  minDurationMinutes={a.minDurationMinutes ?? undefined}
                  maxDurationMinutes={a.maxDurationMinutes ?? undefined}
                  stimulationLevel={
                    (a.stimulationLevel as 'low' | 'medium' | 'high' | null) ?? undefined
                  }
                />
                <LinkButton
                  href={
                    selectedChildId
                      ? `/activity/${a.activityId}?childId=${selectedChildId}`
                      : `/activity/${a.activityId}`
                  }
                  variant="secondary"
                  size="md"
                  icon="book"
                >
                  開始這個活動
                </LinkButton>
              </Card>
            ))}
          </ul>
        </div>
      )}
    </PageShell>
  )
}
