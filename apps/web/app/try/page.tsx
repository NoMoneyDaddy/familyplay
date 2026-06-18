'use client'

import Link from 'next/link'
import { useState } from 'react'
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

interface Recommendation {
  id: string
  title: string
  score: number
  reasons: string[]
  minDurationMinutes?: number
  maxDurationMinutes?: number
  stimulationLevel?: 'low' | 'medium' | 'high'
  developmentalFocus?: string[]
}

export default function TryPage() {
  const [ageMonths, setAgeMonths] = useState<number | null>(null)
  const [energy, setEnergy] = useState<string | null>(null)
  const [context, setContext] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Recommendation[] | null>(null)

  const canSubmit = ageMonths !== null && energy !== null && context !== null

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('請先選擇孩子年齡、你的精力與現在的情境')
      return
    }
    setError(null)
    setLoading(true)
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
      })
      const data = await res.json()
      if (res.ok) {
        setResults(data.recommendations || [])
      } else {
        setError(data.error || '取得推薦失敗，請再試一次')
      }
    } catch {
      setError('發生錯誤，請再試一次')
    } finally {
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
      </PageShell>
    )
  }

  // ── 輸入畫面 ──
  return (
    <PageShell withNav={false}>
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
                onClick={() => setAgeMonths(band.months)}
                className={`rounded-xl border px-1 py-3 text-xs font-medium shadow-clay-sm transition-all hover:-translate-y-0.5 ${
                  ageMonths === band.months
                    ? 'border-brand bg-brand-tint text-brand-strong shadow-clay'
                    : 'border-border/60 bg-card text-text'
                }`}
              >
                {band.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 精力 */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text">你現在的精力？</legend>
          <div className="grid grid-cols-2 gap-3">
            {ENERGY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setEnergy(o.value)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-clay-sm transition-all hover:-translate-y-0.5 ${
                  energy === o.value
                    ? 'border-brand bg-brand-tint shadow-clay'
                    : 'border-border/60 bg-card'
                }`}
              >
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name={o.icon} className="h-[24px] w-[24px]" />
                </span>
                <span className="text-sm font-medium text-text">{o.label}</span>
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
    </PageShell>
  )
}
