'use client'

import { type AssessmentDomain, MILESTONES } from '@familyplay/assessment'
import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { Callout, FOCUS_LABEL, Icon, LinkButton, PageHeader, PageShell } from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useChildStore } from '@/lib/stores/useChildStore'
import { useGoBack } from '@/lib/use-go-back'

// 領域顯示順序（與發展評估慣例一致：粗大動作→精細→語言→社交→情緒）
const DOMAIN_ORDER: AssessmentDomain[] = [
  'gross_motor',
  'fine_motor',
  'language',
  'social_cognitive',
  'emotional',
]

// 依領域分組里程碑（MILESTONES 已照月齡排序）
const MILESTONES_BY_DOMAIN = DOMAIN_ORDER.map((domain) => ({
  domain,
  label: FOCUS_LABEL[domain] ?? domain,
  items: MILESTONES.filter((m) => m.domain === domain),
}))

const TOTAL = MILESTONES.length

export default function CapabilitiesPage() {
  const { selectedChildId, hasHydrated } = useChildStore()
  const goBack = useGoBack('/history')
  // 已達成能力 map（camelCase key → true）
  const [achieved, setAchieved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  // 正在送出的 key（避免重複點擊；逐顆顯示 pending）
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchWithTimeout(`/api/capabilities?childId=${selectedChildId}`)
      .then((res) => (res.ok ? res.json() : { capabilities: {} }))
      .then((data) => {
        if (!cancelled) setAchieved(data.capabilities || {})
      })
      .catch(() => {
        if (!cancelled) setAchieved({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedChildId])

  const achievedCount = Object.values(achieved).filter(Boolean).length

  const toggle = async (key: string) => {
    if (!selectedChildId || pending.has(key)) return
    const next = !achieved[key]
    setError(null)
    // 樂觀更新
    setAchieved((prev) => {
      const copy = { ...prev }
      if (next) copy[key] = true
      else delete copy[key]
      return copy
    })
    setPending((prev) => new Set(prev).add(key))
    try {
      const res = await fetch('/api/capabilities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: selectedChildId, capabilityKey: key, achieved: next }),
      })
      if (!res.ok) throw new Error('save failed')
      // 不用伺服器回傳的整份 map 覆蓋本地：併發標記不同能力時，先回來的請求其回應
      // 不含尚在處理中的另一鍵，覆蓋會造成勾選閃爍。樂觀更新已精準，成功即維持。
    } catch {
      // 失敗回復
      setAchieved((prev) => {
        const copy = { ...prev }
        if (next) delete copy[key]
        else copy[key] = true
        return copy
      })
      setError('儲存失敗，請稍後再試。')
    } finally {
      setPending((prev) => {
        const copy = new Set(prev)
        copy.delete(key)
        return copy
      })
    }
  }

  return (
    <PageShell>
      {/* ChildSwitcher 一律掛載：它負責抓孩子清單並設定當前孩子 */}
      <ChildSwitcher />
      <PageHeader
        title="發展里程碑"
        subtitle={`已會 ${achievedCount} / ${TOTAL} 項`}
        onBack={goBack}
      />

      {!hasHydrated ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : !selectedChildId ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-muted">還沒有孩子檔案</p>
          <LinkButton href="/children/add" icon="plus">
            新增孩子
          </LinkButton>
        </div>
      ) : loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : (
        <div className="space-y-5">
          <Callout title="標記越準，推薦越貼近">
            勾選孩子<strong className="text-text">已經會</strong>的，我們會用這些來推薦
            <strong className="text-text">正好在發展中</strong>
            的活動，更貼近他的程度。不確定就先跳過。
          </Callout>

          {error && (
            <p className="rounded-lg bg-danger-tint px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          {MILESTONES_BY_DOMAIN.map(({ domain, label, items }) => {
            const domainDone = items.filter((m) => achieved[m.key]).length
            return (
              <section key={domain} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-bold text-text">{label}</h2>
                  <span className="text-xs text-faint">
                    {domainDone} / {items.length}
                  </span>
                </div>
                <ul className="grid gap-2">
                  {items.map((m) => {
                    const done = !!achieved[m.key]
                    const busy = pending.has(m.key)
                    return (
                      <li key={m.key}>
                        <button
                          type="button"
                          onClick={() => toggle(m.key)}
                          aria-pressed={done}
                          disabled={busy}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-60 ${
                            done
                              ? 'border-transparent bg-success-tint'
                              : 'border-border bg-card hover:border-brand/50'
                          }`}
                        >
                          <span className="min-w-0">
                            <span
                              className={`block font-medium ${done ? 'text-success' : 'text-text'}`}
                            >
                              {m.label}
                            </span>
                            <span className="block text-xs text-faint">約 {m.typicalMonths}</span>
                          </span>
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              done
                                ? 'border-success bg-success text-white'
                                : 'border-border bg-transparent'
                            }`}
                            aria-hidden="true"
                          >
                            {done && <Icon name="check" className="h-[15px] w-[15px]" />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}

          <p className="text-center text-xs text-faint">
            隨孩子成長隨時更新，這裡只給你參考、不是評比。
          </p>
        </div>
      )}
    </PageShell>
  )
}
