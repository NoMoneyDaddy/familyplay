'use client'

import type { WeeklyInsights } from '@familyplay/data'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { Mascot } from '@/app/components/mascot'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  type IconName,
  LinkButton,
  PageHeader,
  PageShell,
  Select,
  TextInput,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useChildStore } from '@/lib/stores/useChildStore'

interface Log {
  id: string
  activityTitle: string
  outcome: string
  childReaction: string
  createdAt: string
  durationSecs?: number
  editable?: boolean
  caregiverName?: string | null
}

const OUTCOME_BADGE: Record<string, { icon: IconName; wrap: string }> = {
  completed: { icon: 'check', wrap: 'bg-success-tint text-success' },
  tried: { icon: 'today', wrap: 'bg-brand-tint text-brand-strong' },
  abandoned: { icon: 'clock', wrap: 'bg-warning-tint text-warning' },
  default: { icon: 'edit', wrap: 'bg-bg text-muted' },
}

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: 'completed', label: '完成' },
  { value: 'tried', label: '有嘗試' },
  { value: 'abandoned', label: '中途結束' },
]

const REACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'happy', label: '開心' },
  { value: 'engaged', label: '投入' },
  { value: 'neutral', label: '普通' },
  { value: 'leaving', label: '想離開' },
  { value: 'disinterested', label: '沒興趣' },
  { value: 'calmed', label: '平靜下來' },
]

const OUTCOME_LABEL: Record<string, string> = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o.label]),
)
const REACTION_LABEL: Record<string, string> = Object.fromEntries(
  REACTION_OPTIONS.map((o) => [o.value, o.label]),
)

interface Draft {
  outcome: string
  childReaction: string
  durationMins: string
}

export default function HistoryPage() {
  const { selectedChildId, hasHydrated } = useChildStore()
  const [logs, setLogs] = useState<Log[]>([])
  const [streak, setStreak] = useState(0)
  const [weekly, setWeekly] = useState<WeeklyInsights | null>(null)
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ outcome: '', childReaction: '', durationMins: '' })
  const [saving, setSaving] = useState(false)
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchWithTimeout(`/api/logs?childId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))

    // 連續天數與本週洞察（情感回饋，次要資訊，失敗靜默回退）
    setStreak(0)
    setWeekly(null)
    fetchWithTimeout(`/api/insights?childId=${selectedChildId}`)
      .then((res) => (res.ok ? res.json() : { streak: 0, weekly: null }))
      .then((data) => {
        setStreak(data.streak || 0)
        setWeekly(data.weekly || null)
      })
      .catch(() => {})
  }, [selectedChildId])

  // 進入編輯時把焦點移到第一個欄位，鍵盤/讀屏使用者才知道表單已展開、不會迷失在原處。
  useEffect(() => {
    if (!editingId) return
    document.getElementById(`outcome-${editingId}`)?.focus()
  }, [editingId])

  const startEdit = (log: Log) => {
    setError(null)
    setEditingId(log.id)
    setDraft({
      outcome: log.outcome || 'completed',
      childReaction: log.childReaction || 'happy',
      durationMins: log.durationSecs ? String(Math.round(log.durationSecs / 60)) : '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const saveEdit = async (id: string) => {
    const mins = draft.durationMins.trim()
    // 防呆：非空但不是有效的正數 → 擋下，避免 NaN 經 JSON.stringify 變 null 把時長清空
    if (mins !== '' && (!Number.isFinite(Number(mins)) || Number(mins) <= 0)) {
      setError('時長請輸入大於 0 的數字，或留空。')
      return
    }
    setSaving(true)
    setError(null)
    const payload: Record<string, unknown> = {
      outcome: draft.outcome,
      childReaction: draft.childReaction,
      durationSecs: mins === '' ? null : Math.max(1, Math.round(Number(mins) * 60)),
    }
    try {
      const res = await fetch(`/api/logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        setError('儲存失敗，請稍後再試。')
        return
      }
      setLogs((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                outcome: draft.outcome,
                childReaction: draft.childReaction,
                durationSecs: mins === '' ? undefined : Math.max(1, Math.round(Number(mins) * 60)),
              }
            : l,
        ),
      )
      setEditingId(null)
    } catch {
      setError('儲存失敗，請檢查網路後再試。')
    } finally {
      setSaving(false)
    }
  }

  const deleteLog = async (id: string) => {
    if (!window.confirm('確定要刪除這筆陪伴紀錄嗎？此動作無法復原。')) return
    setBusyDeleteId(id)
    setError(null)
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('刪除失敗，請稍後再試。')
        return
      }
      setLogs((prev) => prev.filter((l) => l.id !== id))
      if (editingId === id) setEditingId(null)
    } catch {
      setError('刪除失敗，請檢查網路後再試。')
    } finally {
      setBusyDeleteId(null)
    }
  }

  // 溫和累積感（非 streak，斷一天不該有罪惡感）：近 7 個日曆天有陪伴的「不同天數」。
  // 用今天 00:00 往前推 6 天（而非滾動 168 小時），否則同一筆紀錄會在一天之內過了時刻就消失。
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - 6)
  const weekDays = new Set(
    logs
      .filter((l) => new Date(l.createdAt).getTime() >= weekStart.getTime())
      .map((l) => new Date(l.createdAt).toLocaleDateString('zh-TW')),
  ).size

  return (
    <PageShell>
      {/* ChildSwitcher 一律掛載：它負責抓孩子清單並設定當前孩子 */}
      <ChildSwitcher />
      <PageHeader title="陪伴紀錄" subtitle="回顧過去的親子時光，可隨時修改或刪除" />

      {/* 發展里程碑入口：標記孩子會了什麼 → 讓推薦更貼近他的程度 */}
      <Link
        href="/capabilities"
        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-clay-sm transition-colors hover:border-brand/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <Icon name="sparkle" className="h-[20px] w-[20px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text">發展里程碑</span>
          <span className="block text-xs text-muted">標記孩子會了什麼，推薦更貼近他的程度</span>
        </span>
        <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-faint" />
      </Link>

      {/* 連續陪伴天數：強化習慣養成的成就感 */}
      {selectedChildId && streak > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-brand-tint p-4 shadow-clay-sm">
          <span className="text-3xl" aria-hidden>
            🔥
          </span>
          <div>
            <p className="text-lg font-bold text-brand-strong">連續陪伴 {streak} 天</p>
            <p className="text-xs text-brand-strong">每天一點點，就是最好的陪伴</p>
          </div>
        </div>
      )}

      {/* 本週洞察：給家長一個「你做得很好」的情感回饋 */}
      {selectedChildId && weekly && weekly.sessions > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-clay-sm">
          <p className="mb-3 text-sm font-semibold text-text">本週陪伴</p>
          <div className="flex justify-between">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-brand">{weekly.sessions}</p>
              <p className="text-xs text-muted">次陪伴</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-brand">{weekly.activeDays}</p>
              <p className="text-xs text-muted">天有陪</p>
            </div>
            {weekly.positiveReactionRate != null && (
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-brand">
                  {Math.round(weekly.positiveReactionRate * 100)}%
                </p>
                <p className="text-xs text-muted">玩得開心</p>
              </div>
            )}
          </div>
          {weekly.topActivityTitle && (
            <p className="mt-3 text-sm text-muted">
              最常玩：<span className="text-text">{weekly.topActivityTitle}</span>
            </p>
          )}
        </div>
      )}

      {/* 交接小卡：把孩子近況濃縮成一張可分享的卡，給接手的家人快速進入狀況 */}
      <Link
        href="/handoff"
        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-clay-sm transition-colors hover:border-brand/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <Icon name="link" className="h-[20px] w-[20px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text">交接小卡</span>
          <span className="block text-xs text-muted">一眼看懂近況，分享給接手的家人</span>
        </span>
        <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-faint" />
      </Link>

      {error && (
        <p className="rounded-lg bg-danger-tint px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

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
          先建立孩子檔案，之後的陪伴紀錄就會收在這裡。
        </EmptyState>
      ) : loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="還沒有陪伴紀錄">
          完成一個活動並記錄孩子的反應後，就會出現在這裡，陪你看見每天的累積。
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {/* 波波陪伴：把累積說成鼓勵，不是進度條 */}
          <Card className="flex items-center gap-3 bg-brand-tint/50">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-clay-sm">
              <Mascot className="h-9 w-9" />
            </span>
            <p className="text-sm leading-relaxed text-text">
              這週你陪了寶寶 <strong className="text-brand-strong">{weekDays}</strong> 天，
              <span className="text-muted">每一次都算數 ☁️</span>
            </p>
          </Card>
          <ul className="space-y-3">
            {logs.map((log) => {
              const badge = OUTCOME_BADGE[log.outcome] ?? OUTCOME_BADGE.default
              const isEditing = editingId === log.id
              return (
                <Card key={log.id} as="li" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-text">{log.activityTitle}</p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        <span>{new Date(log.createdAt).toLocaleDateString('zh-TW')}</span>
                        {/* 多人家庭才有值：讓家長一眼看出這次是誰陪的 */}
                        {log.caregiverName && (
                          <span className="inline-flex items-center gap-1 text-brand-strong">
                            <Icon name="user" className="h-[13px] w-[13px]" />
                            {log.caregiverName} 陪的
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      role="img"
                      aria-label={`結果：${OUTCOME_LABEL[log.outcome] ?? log.outcome}`}
                      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${badge.wrap}`}
                    >
                      <Icon name={badge.icon} className="h-[18px] w-[18px]" />
                    </span>
                  </div>

                  {isEditing ? (
                    <div
                      id={`edit-form-${log.id}`}
                      className="mt-3 space-y-3 border-t border-border pt-3"
                    >
                      <Field label="結果" htmlFor={`outcome-${log.id}`}>
                        <Select
                          id={`outcome-${log.id}`}
                          value={draft.outcome}
                          onChange={(e) => setDraft((d) => ({ ...d, outcome: e.target.value }))}
                        >
                          {OUTCOME_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="孩子的反應" htmlFor={`reaction-${log.id}`}>
                        <Select
                          id={`reaction-${log.id}`}
                          value={draft.childReaction}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, childReaction: e.target.value }))
                          }
                        >
                          {REACTION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="時長（分鐘，可留空）" htmlFor={`mins-${log.id}`}>
                        <TextInput
                          id={`mins-${log.id}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          placeholder="例如 15"
                          value={draft.durationMins}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, durationMins: e.target.value }))
                          }
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="md"
                          icon="check"
                          loading={saving}
                          onClick={() => saveEdit(log.id)}
                        >
                          儲存
                        </Button>
                        <Button size="md" variant="ghost" icon="x" onClick={cancelEdit}>
                          取消
                        </Button>
                        <Button
                          size="md"
                          variant="danger"
                          icon="trash"
                          loading={busyDeleteId === log.id}
                          onClick={() => deleteLog(log.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2 text-xs text-muted">
                        <span>結果: {OUTCOME_LABEL[log.outcome] ?? log.outcome}</span>
                        <span>
                          • 反應: {REACTION_LABEL[log.childReaction] ?? log.childReaction}
                        </span>
                        {log.durationSecs && (
                          <span>• {Math.round(log.durationSecs / 60)} 分鐘</span>
                        )}
                      </div>
                      {log.editable && (
                        <button
                          type="button"
                          onClick={() => startEdit(log)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-tint"
                          aria-label="編輯這筆紀錄"
                          aria-expanded={isEditing}
                          aria-controls={`edit-form-${log.id}`}
                        >
                          <Icon name="edit" className="h-[15px] w-[15px]" />
                          編輯
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </ul>
        </div>
      )}
    </PageShell>
  )
}
