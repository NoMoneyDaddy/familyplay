'use client'

import {
  type AssessmentDomain,
  getZpdTargets,
  MILESTONE_MAP,
  MILESTONES,
} from '@familyplay/assessment'
import {
  ALLOWED_CAPABILITY_KEYS,
  type CapabilityKey,
  type CapabilityProfile,
} from '@familyplay/core'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { GrowthTracker } from '@/app/components/growth-tracker'
import { type Celebration, MilestoneCelebration } from '@/app/components/milestone-celebration'
import {
  Callout,
  EmptyState,
  FOCUS_LABEL,
  Icon,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'
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

// 「成就型里程碑」：在逐顆能力之上，標出值得慶祝的關鍵時刻——
// 第一顆、各領域全達成、全部達成。第一次達成時觸發慶祝特效（見下方 localStorage 去重）。
function buildAchievements(achieved: CapabilityProfile): Celebration[] {
  const out: Celebration[] = []
  const count = Object.values(achieved).filter(Boolean).length
  if (count >= 1) {
    out.push({ id: 'first', title: '解鎖第一個里程碑！', subtitle: '標記孩子會的，推薦會更貼近他' })
  }
  for (const { domain, label, items } of MILESTONES_BY_DOMAIN) {
    if (items.length > 0 && items.every((m) => achieved[m.key])) {
      out.push({ id: `domain:${domain}`, title: `${label}全部會了！`, subtitle: '又長大了一些' })
    }
  }
  if (TOTAL > 0 && count === TOTAL) {
    out.push({ id: 'all', title: '所有里程碑都達成了！', subtitle: '你陪他走了好長一段路' })
  }
  return out
}

export default function CapabilitiesPage() {
  const { selectedChildId, hasHydrated } = useChildStore()
  const goBack = useGoBack('/history')
  // 已達成能力 map（白名單 CapabilityKey → true）
  const [achieved, setAchieved] = useState<CapabilityProfile>({})
  const [loading, setLoading] = useState(true)
  // 正在送出的 key（避免重複點擊；逐顆顯示 pending）
  const [pending, setPending] = useState<Set<CapabilityKey>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // 慶祝特效佇列：一次顯示一個，消失後取下一個。
  const [celebrationQueue, setCelebrationQueue] = useState<Celebration[]>([])
  const [currentCelebration, setCurrentCelebration] = useState<Celebration | null>(null)
  // 已慶祝過的成就 id（每孩子一份，存 localStorage，確保「只在第一次達成時」觸發）
  const celebratedRef = useRef<Set<string>>(new Set())
  const seededChildRef = useRef<string | null>(null)

  // 偵測新達成的成就型里程碑並排入慶祝佇列。首次載入某孩子時以「目前已達成」為基準
  // 靜默建檔（不為先前就會的東西放彩帶），之後新達成的才慶祝。
  const detectMilestones = useCallback(
    (map: CapabilityProfile) => {
      const cid = selectedChildId
      if (!cid) return
      const storageKey = `fp_milestone_celebrated:${cid}`
      const met = buildAchievements(map)
      const enqueue = (fresh: Celebration[]) => {
        if (!fresh.length) return
        for (const c of fresh) celebratedRef.current.add(c.id)
        try {
          localStorage.setItem(storageKey, JSON.stringify([...celebratedRef.current]))
        } catch {
          // localStorage 不可用：仍在本次 session 內去重（celebratedRef），不影響流程
        }
        setCelebrationQueue((q) => [...q, ...fresh])
      }

      if (seededChildRef.current !== cid) {
        // 換到（或首次處理）這個孩子：載入已慶祝集合
        let stored: string[] | null = null
        try {
          const raw = localStorage.getItem(storageKey)
          stored = raw ? (JSON.parse(raw) as string[]) : null
        } catch {
          stored = null
        }
        seededChildRef.current = cid
        if (stored == null) {
          // 從未追蹤過：以現況為基準靜默建檔，不放彩帶
          celebratedRef.current = new Set(met.map((m) => m.id))
          try {
            localStorage.setItem(storageKey, JSON.stringify([...celebratedRef.current]))
          } catch {
            // 同上，可忽略
          }
          return
        }
        celebratedRef.current = new Set(stored)
        enqueue(met.filter((m) => !celebratedRef.current.has(m.id)))
        return
      }
      // 同一孩子的後續變動（勾選）：新達成的才慶祝
      enqueue(met.filter((m) => !celebratedRef.current.has(m.id)))
    },
    [selectedChildId],
  )

  // 資料就緒後（載入完成或勾選後 achieved 變動）偵測里程碑。loading 中略過，
  // 避免換孩子時用上一個孩子的暫存資料誤判。
  useEffect(() => {
    if (loading) return
    detectMilestones(achieved)
  }, [achieved, loading, detectMilestones])

  // 佇列推進：目前沒有正在顯示的就取下一個
  useEffect(() => {
    if (!currentCelebration && celebrationQueue.length > 0) {
      setCurrentCelebration(celebrationQueue[0])
      setCelebrationQueue((q) => q.slice(1))
    }
  }, [celebrationQueue, currentCelebration])

  const dismissCelebration = useCallback(() => setCurrentCelebration(null), [])

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

  // 「下一步」建議：依已會的里程碑推出正在發展中（ZPD）的下一顆，與推薦引擎的 ZPD 評分一致。
  // 只在有勾選且有後續里程碑時出現，給家長一個具體的努力方向。memo 化避免每次重渲染重算。
  const nextItems = useMemo(() => {
    // 從白名單推導，避免把任意 string key 強制轉成 CapabilityKey（與 #62 的作法一致）
    const achievedKeys = ALLOWED_CAPABILITY_KEYS.filter((k) => achieved[k] === true)
    return getZpdTargets(achievedKeys)
      .map((k) => MILESTONE_MAP.get(k))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [achieved])

  const toggle = async (key: CapabilityKey) => {
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
      {/* 里程碑慶祝特效：達成「成就型里程碑」時短暫飄彩帶（reduced-motion 安全） */}
      <MilestoneCelebration celebration={currentCelebration} onDone={dismissCelebration} />
      {/* ChildSwitcher 一律掛載：它負責抓孩子清單並設定當前孩子 */}
      <ChildSwitcher />
      <PageHeader title="發展里程碑" subtitle="標記孩子已經會的，推薦會更貼近他" onBack={goBack} />

      {/* 簽名強化：把「已會 X / TOTAL」從一句副標升級成一條黏土進度條，
          讓家長一眼看到整體進展、也給標記里程碑這件事一點累積的成就感。
          只在已選孩子且資料就緒時顯示，避免在載入/空狀態出現空條。 */}
      {hasHydrated && selectedChildId && !loading && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-text">整體進展</span>
            <span className="text-muted">
              已會 <span className="font-display font-bold text-brand">{achievedCount}</span> /{' '}
              {TOTAL} 項
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-brand-tint shadow-[inset_0_1px_2px_rgb(74_49_28/0.08)]"
            role="progressbar"
            aria-valuenow={achievedCount}
            aria-valuemin={0}
            aria-valuemax={TOTAL}
            aria-label={`發展里程碑進度：${TOTAL} 項中已會 ${achievedCount} 項`}
          >
            <div
              className="h-full rounded-full bg-[image:var(--gradient-brand)] transition-[width] duration-500 ease-out"
              style={{ width: `${TOTAL ? (achievedCount / TOTAL) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 成長紀錄（身高/體重/頭圍）：發展評估的量化面，與里程碑互補 */}
      {hasHydrated && selectedChildId && <GrowthTracker childId={selectedChildId} />}

      {!hasHydrated ? (
        <div className="text-center text-muted" role="status">
          載入中…
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
          先建立孩子的檔案，就能開始標記里程碑、讓推薦更貼近他的發展。
        </EmptyState>
      ) : loading ? (
        // 骨架：先佔好里程碑清單的位置，避免抓到資料後版面跳動
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[58px] animate-pulse rounded-xl border border-border/60 bg-card"
            />
          ))}
          <span className="sr-only" role="status">
            載入中…
          </span>
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

          {/* 下一步：把評估結果轉成一個具體方向 + 直接看適合的活動 */}
          {nextItems.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-brand/20 bg-brand-tint/40 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card text-brand">
                  <Icon name="sparkle" className="h-[16px] w-[16px]" />
                </span>
                <h2 className="text-sm font-semibold text-text">接下來正在發展中</h2>
              </div>
              <ul className="flex flex-wrap gap-2">
                {nextItems.map((m) => (
                  <li
                    key={m.key}
                    className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-brand-strong"
                  >
                    {m.label}
                    <span className="ml-1 text-faint">約 {m.typicalMonths}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                推薦會優先挑能練到這些的活動——
                <Link href="/now" className="font-medium text-brand hover:opacity-70">
                  去看適合的陪玩 →
                </Link>
              </p>
            </section>
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
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 enabled:active:scale-[0.99] disabled:opacity-60 ${
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
