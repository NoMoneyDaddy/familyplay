'use client'

import { getZpdTargets, MILESTONE_MAP } from '@familyplay/assessment'
import { ALLOWED_CAPABILITY_KEYS } from '@familyplay/core'
import { useEffect, useMemo, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import {
  Button,
  Card,
  EmptyState,
  Icon,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { stageLabel } from '@/lib/stage-labels'
import { useChildStore } from '@/lib/stores/useChildStore'
import { useGoBack } from '@/lib/use-go-back'

// 交接小卡：把「孩子現在到哪了 + 最近陪了什麼 + 接下來在發展什麼」濃縮成一張可分享的卡，
// 給接手的家人（奶奶、另一半…）30 秒進入狀況。純唯讀、用既有 API 即時組，不寫資料庫、不送 AI。

interface Log {
  id: string
  activityTitle: string
  outcome: string
  createdAt: string
  caregiverName?: string | null
}

const OUTCOME_LABEL: Record<string, string> = {
  completed: '完成',
  tried: '有嘗試',
  abandoned: '中途結束',
}

const RECENT_COUNT = 3

export default function HandoffPage() {
  const { selectedChildId, children, hasHydrated } = useChildStore()
  const goBack = useGoBack('/history')
  const [logs, setLogs] = useState<Log[]>([])
  const [achieved, setAchieved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [shareNote, setShareNote] = useState<string | null>(null)

  const child = children.find((c) => c.id === selectedChildId)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchWithTimeout(`/api/logs?childId=${selectedChildId}`)
        .then((r) => (r.ok ? r.json() : { logs: [] }))
        .catch(() => ({ logs: [] })),
      fetchWithTimeout(`/api/capabilities?childId=${selectedChildId}`)
        .then((r) => (r.ok ? r.json() : { capabilities: {} }))
        .catch(() => ({ capabilities: {} })),
    ]).then(([logData, capData]) => {
      if (cancelled) return
      setLogs(logData.logs || [])
      setAchieved(capData.capabilities || {})
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedChildId])

  const recent = logs.slice(0, RECENT_COUNT)

  const nextItems = useMemo(() => {
    const achievedKeys = ALLOWED_CAPABILITY_KEYS.filter((k) => achieved[k] === true)
    return getZpdTargets(achievedKeys)
      .map((k) => MILESTONE_MAP.get(k))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [achieved])

  const stage = stageLabel(child?.stageKey)

  // 成功類提示 2.5 秒自動收起；卸載即清掉計時器避免對已卸載組件 setState。
  // 「不支援」屬需要使用者看到並手動操作的提示，不自動消失。
  useEffect(() => {
    if (!shareNote || shareNote.includes('不支援')) return
    const timer = setTimeout(() => setShareNote(null), 2500)
    return () => clearTimeout(timer)
  }, [shareNote])

  // 分享用的純文字版（不含真實生日等敏感資料；暱稱由家長自填、屬可分享範圍）
  const buildText = () => {
    const name = child?.nickname || '寶寶'
    const lines = [`${name}的陪伴交接小卡`, '']
    if (stage) lines.push(`📍 現在階段：${stage}`, '')
    if (recent.length > 0) {
      lines.push('🧸 最近陪玩：')
      for (const l of recent) {
        const date = new Date(l.createdAt).toLocaleDateString('zh-TW')
        const who = l.caregiverName ? `，${l.caregiverName}陪` : ''
        lines.push(
          `· ${l.activityTitle}（${OUTCOME_LABEL[l.outcome] ?? l.outcome}，${date}${who}）`,
        )
      }
      lines.push('')
    }
    if (nextItems.length > 0) {
      lines.push(`🌱 接下來在發展：${nextItems.map((m) => m.label).join('、')}`, '')
    }
    lines.push('💛 by FamilyPlay')
    return lines.join('\n')
  }

  const handleShare = async () => {
    const text = buildText()
    const shareData = { title: '陪伴交接小卡', text }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // 使用者取消或不支援，往下退回複製
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        setShareNote('已複製到剪貼簿，貼給家人就好 ☁️')
        return
      } catch {
        // 落到最後的提示
      }
    }
    setShareNote('這個瀏覽器不支援自動分享，請長按上方內容手動複製。')
  }

  return (
    <PageShell>
      <ChildSwitcher />
      <PageHeader
        title="交接小卡"
        subtitle="一眼看懂孩子現在的狀態，分享給接手的家人"
        onBack={goBack}
      />

      {!hasHydrated ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : !selectedChildId ? (
        <EmptyState
          title="還沒有孩子檔案"
          action={
            <LinkButton href="/children/add" icon="plus">
              新增孩子
            </LinkButton>
          }
        >
          先建立孩子檔案，就能產生交接小卡。
        </EmptyState>
      ) : loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-text">{child?.nickname || '寶寶'}的小卡</h2>

            {stage && (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                  <Icon name="child" className="h-[16px] w-[16px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted">現在階段</p>
                  <p className="text-sm text-text">{stage}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                <Icon name="today" className="h-[16px] w-[16px]" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">最近陪玩</p>
                {recent.length === 0 ? (
                  <p className="text-sm text-faint">還沒有紀錄</p>
                ) : (
                  <ul className="space-y-1">
                    {recent.map((l) => (
                      <li key={l.id} className="text-sm text-text">
                        {l.activityTitle}
                        <span className="text-faint">
                          （{OUTCOME_LABEL[l.outcome] ?? l.outcome}
                          {l.caregiverName ? `，${l.caregiverName}陪` : ''}）
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {nextItems.length > 0 && (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                  <Icon name="sparkle" className="h-[16px] w-[16px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted">接下來在發展</p>
                  <p className="text-sm text-text">{nextItems.map((m) => m.label).join('、')}</p>
                </div>
              </div>
            )}
          </Card>

          {shareNote && (
            <p
              className="rounded-lg bg-brand-tint px-4 py-3 text-center text-sm text-brand-strong"
              role="status"
            >
              {shareNote}
            </p>
          )}

          <Button size="lg" icon="link" className="w-full" onClick={handleShare}>
            分享給家人
          </Button>

          <p className="text-center text-xs text-faint">
            內容即時整理，不含生日等敏感資料；只在你按分享時才送出。
          </p>
        </div>
      )}
    </PageShell>
  )
}
