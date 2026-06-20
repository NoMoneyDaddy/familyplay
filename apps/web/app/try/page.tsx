'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FocusIllustration } from '@/app/components/focus-illustration'
import { Mascot } from '@/app/components/mascot'
import {
  ActivityMeta,
  Button,
  Card,
  ErrorAlert,
  Icon,
  type IconName,
  LinkButton,
  PageHeader,
  PageShell,
} from '@/app/components/ui'
import { type Recommendation, timeDefaultContext } from '@/lib/recommendation'

// 年齡帶 → 代表月齡（取各發展階段中段），讓年齡安全過濾正確運作
const AGE_BANDS: { label: string; months: number }[] = [
  { label: '0–3 個月', months: 2 },
  { label: '3–6 個月', months: 4 },
  { label: '6–9 個月', months: 7 },
  { label: '9–12 個月', months: 10 },
  { label: '1–1.5 歲', months: 15 },
  { label: '1.5–2 歲', months: 21 },
  { label: '2–3 歲', months: 30 },
  { label: '3–4 歲', months: 42 },
  { label: '4–5 歲', months: 54 },
]

const ENERGY_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: 'exhausted', label: '累到不行', icon: 'batteryEmpty' },
  { value: 'low', label: '有點累', icon: 'batteryLow' },
  { value: 'medium', label: '還好', icon: 'batteryMid' },
  { value: 'high', label: '精力滿滿', icon: 'batteryFull' },
]

const CONTEXT_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: 'normal', label: '正常時光', icon: 'today' },
  { value: 'bedtime', label: '睡前時間', icon: 'moon' },
  { value: 'emotional_crisis', label: '情緒比較激動', icon: 'cloudBolt' },
  { value: 'sick_day', label: '生病/休息日', icon: 'thermometer' },
]

const AGE_STORAGE_KEY = 'fp_try_age_months'

export default function TryPage() {
  const [ageMonths, setAgeMonths] = useState<number | null>(null)
  // 精力預設「有點累」（疲憊是常態，給低負擔最安全；可改）。讓返訪者（年齡已記住）
  // 一進來三項就齊、直接出方案；新訪者也只需選年齡。
  const [energy, setEnergy] = useState<string | null>('low')
  const [context, setContext] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Recommendation[] | null>(null)

  // 匿名回訪者免得每次重填：掛載後預填上次的年齡，並依時段預選情境（皆可改）。
  // 精力是當下狀態、刻意不記憶。在 effect 內讀 localStorage 以避開 SSR 不一致。
  useEffect(() => {
    // localStorage 在隱私模式/停用儲存/沙盒 iframe 可能 throw；包 try-catch 免掛載崩潰。
    // 用 prev ?? 預設，避免效果在首繪後蓋掉使用者已搶先點選的值。
    const defaultContext = timeDefaultContext()
    setContext((prev) => prev ?? defaultContext)
    try {
      const saved = Number(localStorage.getItem(AGE_STORAGE_KEY))
      if (AGE_BANDS.some((b) => b.months === saved)) {
        setAgeMonths((prev) => prev ?? saved)
      }
    } catch {
      // 讀取失敗就不預填，不影響使用
    }
  }, [])

  const selectAge = (months: number) => {
    setAgeMonths(months)
    try {
      localStorage.setItem(AGE_STORAGE_KEY, String(months))
    } catch {
      // 寫入失敗（停用/配額）僅是無法記憶，不影響本次流程
    }
  }

  const canSubmit = ageMonths !== null && energy !== null && context !== null

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('請先選擇孩子年齡、你的精力與現在的情境')
      return
    }
    setError(null)
    setLoading(true)
    // 逾時保護：網路卡住時 15 秒中止，避免按鈕永遠轉圈、使用者只能重整。
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageMonths,
          parentEnergy: energy,
          context,
          availableSpace: 'anywhere',
          maxDurationMinutes: 20,
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (res.ok) {
        setResults(data.recommendations || [])
      } else {
        setError(data.error || '取得推薦失敗，請再試一次')
      }
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === 'AbortError'
          ? '連線逾時，請檢查網路後再試一次'
          : '發生錯誤，請再試一次',
      )
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  // ── 結果畫面 ──
  if (results) {
    return (
      <PageShell withNav={false}>
        <PageHeader
          title="這些活動最適合現在"
          subtitle="免費試用版——登入即可保存與記錄"
          align="center"
        />

        {results.length === 0 ? (
          <Card className="text-center text-muted">
            這個組合暫時沒有合適的活動，換個狀態再試試。
          </Card>
        ) : (
          <ol className="space-y-4">
            {results.map((rec, idx) => {
              const isTop = idx === 0
              return (
                <Card as="li" key={rec.id} className={isTop ? 'relative ring-2 ring-brand/60' : ''}>
                  {isTop && (
                    <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-brand)] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-brand">
                      <Icon name="star" className="h-[12px] w-[12px]" />
                      最適合
                    </span>
                  )}
                  <div className="mb-3 flex items-start gap-3">
                    <FocusIllustration
                      focus={rec.developmentalFocus?.[0]}
                      rank={idx + 1}
                      isTop={isTop}
                    />
                    <h2 className="min-w-0 flex-1 pt-1.5 text-lg font-semibold leading-snug text-text">
                      {rec.title}
                    </h2>
                  </div>
                  <ActivityMeta
                    developmentalFocus={rec.developmentalFocus}
                    minDurationMinutes={rec.minDurationMinutes}
                    maxDurationMinutes={rec.maxDurationMinutes}
                    stimulationLevel={rec.stimulationLevel}
                    className="mb-3"
                  />
                  {rec.reasons.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-muted">
                      {rec.reasons.map((reason, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: reasons are static and ordered
                        <li key={i} className="flex items-start gap-1.5">
                          <Icon
                            name="check"
                            className="mt-0.5 h-[14px] w-[14px] shrink-0 text-success"
                          />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )
            })}
          </ol>
        )}

        {/* 轉換：保存／記錄需要帳號 */}
        <Card className="space-y-3 text-center">
          <p className="text-sm text-muted">
            想<strong className="text-text">保存孩子檔案</strong>、
            <strong className="text-text">記錄陪伴</strong>、看見每天的累積？
          </p>
          <LinkButton href="/auth" size="lg" icon="sparkle">
            登入保存（免費）
          </LinkButton>
        </Card>

        <button
          type="button"
          onClick={() => {
            setResults(null)
            setError(null)
          }}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-brand transition-opacity hover:opacity-70"
        >
          <Icon name="refresh" className="h-[16px] w-[16px]" />
          換個狀態再試
        </button>

        <p className="px-2 text-center text-xs leading-relaxed text-faint">
          活動建議僅供親子陪伴參考，非醫療或專業評估，請由成人全程監護。詳見{' '}
          <Link href="/disclaimer" className="underline hover:text-muted">
            免責聲明
          </Link>
          。
        </p>
      </PageShell>
    )
  }

  // ── 輸入畫面 ──
  return (
    <>
      {/* pb-40：預留底部固定 CTA 列的高度，避免內容被遮住 */}
      <PageShell withNav={false} className="pb-40">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[image:var(--gradient-brand)] shadow-brand ring-4 ring-brand-tint">
            <Mascot className="h-11 w-11" />
          </span>
          <PageHeader
            title="免費試試看"
            subtitle="不用註冊，30 秒拿到今天的陪伴方案"
            align="center"
          />
        </div>

        <div className="space-y-6">
          {/* 年齡 */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text">孩子幾歲？</legend>
            <div className="grid grid-cols-3 gap-2">
              {AGE_BANDS.map((band) => (
                <button
                  key={band.months}
                  type="button"
                  aria-pressed={ageMonths === band.months}
                  onClick={() => selectAge(band.months)}
                  className={`relative rounded-xl px-1 py-3 text-xs font-medium shadow-clay-sm transition-all hover:-translate-y-0.5 ${
                    ageMonths === band.months
                      ? 'border-2 border-brand bg-brand-tint text-brand-strong shadow-clay'
                      : 'border border-border/60 bg-card text-text'
                  }`}
                >
                  {/* 非色彩選取線索（WCAG 1.4.1）：選中時加粗框 + 角落勾 */}
                  {ageMonths === band.months && (
                    <span
                      aria-hidden
                      className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-[9px] leading-none text-white"
                    >
                      ✓
                    </span>
                  )}
                  {band.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 精力 */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text">
              你現在的精力？
              <span className="ml-1.5 font-normal text-faint">已預選，可更改</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {ENERGY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={energy === o.value}
                  onClick={() => setEnergy(o.value)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 shadow-clay-sm transition-all hover:-translate-y-0.5 ${
                    energy === o.value
                      ? 'border-2 border-brand bg-brand-tint shadow-clay'
                      : 'border border-border/60 bg-card'
                  }`}
                >
                  <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <Icon name={o.icon} className="h-[24px] w-[24px]" />
                  </span>
                  <span className="text-sm font-medium text-text">{o.label}</span>
                  {/* 非色彩選取線索：選中時尾端顯示勾 */}
                  {energy === o.value && (
                    <span
                      aria-hidden
                      className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-white"
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 情境 */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text">現在的情境？</legend>
            <div className="grid gap-2.5">
              {CONTEXT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={context === o.value}
                  onClick={() => setContext(o.value)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-clay-sm transition-all hover:-translate-y-0.5 ${
                    context === o.value
                      ? 'border-brand bg-brand-tint shadow-clay'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <Icon name={o.icon} className="h-[22px] w-[22px]" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-text">{o.label}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-transparent ${
                      context === o.value ? 'border-brand bg-brand text-white' : 'border-border'
                    }`}
                  >
                    <Icon name="check" className="h-[12px] w-[12px]" />
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </PageShell>

      {/* 單手友善：主行動固定在底部拇指弧內。放在 PageShell 外（與 BottomNav 同層），
          避開 PageShell overflow-hidden 對 fixed 的影響。/try 無底部導覽故不衝突。 */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] space-y-2 border-t border-border/60 bg-card/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <ErrorAlert message={error} />
        <Button
          size="lg"
          icon="compass"
          loading={loading}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          看看推薦
        </Button>
        <p className="text-center text-xs text-muted">
          已經有帳號？{' '}
          <Link href="/auth" className="font-medium text-brand hover:underline">
            登入
          </Link>
        </p>
      </div>
    </>
  )
}
