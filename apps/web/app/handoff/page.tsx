'use client'

import { getZpdTargets, MILESTONE_MAP } from '@familyplay/assessment'
import { ALLOWED_CAPABILITY_KEYS, ALLOWED_STAGE_KEYS } from '@familyplay/core'
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
import { readAIKey } from '@/lib/ai-key'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { lineShareUrl } from '@/lib/share'
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
  const [loadError, setLoadError] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // AI 潤色出來的溫暖短評（Plus 託管或 BYO key）；失敗則保持 null、續用規則式小卡。
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // 重試用：bump 即重新抓
  const [reloadTick, setReloadTick] = useState(0)

  const child = children.find((c) => c.id === selectedChildId)

  // reloadTick 不在 effect 內被讀取，但作為「重試」觸發器需列入依賴
  // biome-ignore lint/correctness/useExhaustiveDependencies: 刻意用 reloadTick 觸發重抓
  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    // 非 2xx（401/429/500…）視為載入失敗而非「沒有資料」：否則會把失敗渲染成空小卡、
    // 甚至被分享成不完整快照。任一來源失敗即整體標記錯誤、顯示重試。
    const fetchJson = async (url: string) => {
      const r = await fetchWithTimeout(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    }
    Promise.all([
      fetchJson(`/api/logs?childId=${selectedChildId}`),
      fetchJson(`/api/capabilities?childId=${selectedChildId}`),
    ])
      .then(([logData, capData]) => {
        if (cancelled) return
        setLogs(logData.logs || [])
        setAchieved(capData.capabilities || {})
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedChildId, reloadTick])

  const recent = logs.slice(0, RECENT_COUNT)

  const nextItems = useMemo(() => {
    const achievedKeys = ALLOWED_CAPABILITY_KEYS.filter((k) => achieved[k] === true)
    return getZpdTargets(achievedKeys)
      .map((k) => MILESTONE_MAP.get(k))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [achieved])

  // stageKey 先過白名單再進顯示邏輯（CLAUDE.md：所有 stageKey 須對 STAGE_KEYS 驗證）
  const safeStageKey =
    child?.stageKey && (ALLOWED_STAGE_KEYS as readonly string[]).includes(child.stageKey)
      ? child.stageKey
      : undefined
  const stage = stageLabel(safeStageKey)

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
    // AI 潤色短評（若有）放最前面，當作給家人的暖場白
    if (aiSummary) lines.push(aiSummary, '')
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
      } catch (error) {
        // 使用者主動取消分享：尊重其選擇，不要再偷偷複製到剪貼簿（隱私）
        if (error instanceof DOMException && error.name === 'AbortError') return
        // 其餘錯誤（不支援等）才往下退回複製
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

  // AI 潤色：把規則式現況交給 AI 寫成 2–3 句溫暖短評。只送 childId（後端據此取階段＋
  // 發展中能力組白名單輸入，不送暱稱/生日/紀錄原文）。有 BYO 金鑰就帶上，否則走 Plus 託管。
  // 失敗安靜處理：保留規則式小卡，只給溫和訊息。
  const handleAiPolish = async () => {
    if (!selectedChildId || aiLoading) return
    const key = readAIKey()
    setAiLoading(true)
    try {
      const res = await fetchWithTimeout(
        '/api/ai/handoff',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: selectedChildId,
            ...(key ? { provider: key.provider, apiKey: key.apiKey } : {}),
          }),
        },
        20000,
      )
      const data = await res.json()
      if (data.ok && typeof data.summary === 'string') {
        setAiSummary(data.summary)
      } else {
        setShareNote('這次沒潤色成功，可能是金鑰或額度問題，稍後再試。')
      }
    } catch {
      setShareNote('網路不太穩，等一下再試一次。')
    } finally {
      setAiLoading(false)
    }
  }

  // 儲存這張小卡：把即時組好的摘要存進 handoff_summaries，之後家庭成員可回看。
  const handleSave = async () => {
    if (!selectedChildId || saving) return
    setSaving(true)
    try {
      const res = await fetchWithTimeout('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          summaryText: buildText(),
          logsReferenced: recent.map((l) => l.id),
        }),
      })
      setShareNote(res.ok ? '已儲存這張小卡 ☁️' : '儲存沒成功，稍後再試一次。')
    } catch {
      setShareNote('網路不太穩，儲存沒成功，稍後再試。')
    } finally {
      setSaving(false)
    }
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
      ) : loadError ? (
        // 失敗時明確報錯並提供重試，避免把載入失敗誤顯示成空小卡、甚至被分享
        <EmptyState
          title="載入失敗"
          action={
            <Button icon="refresh" onClick={() => setReloadTick((n) => n + 1)}>
              重試
            </Button>
          }
        >
          沒辦法整理出小卡，請檢查網路後再試一次。
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-text">{child?.nickname || '寶寶'}的小卡</h2>

            {aiSummary && (
              <div className="rounded-xl bg-brand-tint px-3.5 py-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-strong">
                  <Icon name="sparkle" className="h-[14px] w-[14px]" />
                  AI 暖場白
                </p>
                <p className="text-sm leading-relaxed text-text">{aiSummary}</p>
              </div>
            )}

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

          <Button
            variant="secondary"
            size="md"
            icon="sparkle"
            loading={aiLoading}
            className="w-full"
            onClick={handleAiPolish}
          >
            {aiSummary ? '重新用 AI 潤色' : '用 AI 潤色（Plus／自帶金鑰）'}
          </Button>

          <Button size="lg" icon="link" className="w-full" onClick={handleShare}>
            分享給家人
          </Button>

          {/* 台灣家庭多用 LINE：一鍵帶預填文字開 LINE 分享，家庭擴張低成本獲客 */}
          <Button
            variant="secondary"
            size="md"
            icon="family"
            className="w-full"
            onClick={() => window.open(lineShareUrl(buildText()), '_blank', 'noopener,noreferrer')}
          >
            分享到 LINE
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon="check"
            loading={saving}
            className="w-full"
            onClick={handleSave}
          >
            儲存這張小卡
          </Button>

          <p className="text-center text-xs text-faint">
            內容即時整理，不含生日等敏感資料；只在你按分享或儲存時才送出。
          </p>
        </div>
      )}
    </PageShell>
  )
}
