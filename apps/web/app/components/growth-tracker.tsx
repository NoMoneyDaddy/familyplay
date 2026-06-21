'use client'

import { useEffect, useState } from 'react'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { Button, Icon } from './ui'

interface Measurement {
  id: string
  measuredOn: string | null
  heightCm: number | null
  weightKg: number | null
  headCircCm: number | null
}

// 三個量測欄位的共用設定（label / 單位 / 取值）
const FIELDS = [
  { key: 'heightCm', label: '身高', unit: 'cm', icon: 'child' as const },
  { key: 'weightKg', label: '體重', unit: 'kg', icon: 'heart' as const },
  { key: 'headCircCm', label: '頭圍', unit: 'cm', icon: 'sparkle' as const },
] as const

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * 成長紀錄（身高/體重/頭圍）。顯示最新一筆 + 可展開的新增表單。
 * 量測值由後端 + DB CHECK 雙重把關；viewer 角色由 RLS 擋寫（這裡仍顯示，送出時後端回 4xx）。
 */
export function GrowthTracker({ childId }: { childId: string }) {
  const [latest, setLatest] = useState<Measurement | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    heightCm: '',
    weightKg: '',
    headCircCm: '',
    measuredOn: todayISO(),
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchWithTimeout(`/api/children/${childId}/growth`)
      .then((r) => (r.ok ? r.json() : { measurements: [] }))
      .then((d) => {
        if (!cancelled) setLatest((d.measurements ?? [])[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) setLatest(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [childId])

  const handleSave = async () => {
    const payload = {
      measuredOn: form.measuredOn,
      heightCm: form.heightCm ? Number(form.heightCm) : null,
      weightKg: form.weightKg ? Number(form.weightKg) : null,
      headCircCm: form.headCircCm ? Number(form.headCircCm) : null,
    }
    if (payload.heightCm == null && payload.weightKg == null && payload.headCircCm == null) {
      setError('至少填一個：身高、體重或頭圍')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/children/${childId}/growth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || '儲存失敗，請稍後再試')
        return
      }
      // 樂觀更新最新值，收合表單（payload 已含 measuredOn）
      setLatest({ id: data.id ?? 'new', ...payload })
      setForm({ heightCm: '', weightKg: '', headCircCm: '', measuredOn: todayISO() })
      setOpen(false)
    } catch {
      setError('網路不太穩，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-clay-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-tint text-brand">
            <Icon name="child" className="h-[15px] w-[15px]" />
          </span>
          成長紀錄
        </h2>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v)
            setError(null)
          }}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-strong transition-opacity hover:opacity-80"
        >
          <Icon name={open ? 'back' : 'plus'} className="h-[13px] w-[13px]" />
          {open ? '收起' : '記一筆'}
        </button>
      </div>

      {/* 最新量測（載入中顯示骨架；無資料顯示提示） */}
      {loading ? (
        <div className="h-10 animate-pulse rounded-xl bg-bg" aria-hidden="true" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.map((f) => {
            const v = latest?.[f.key] ?? null
            return (
              <div key={f.key} className="rounded-xl bg-bg px-2.5 py-2 text-center">
                <p className="text-[11px] text-faint">{f.label}</p>
                <p className="font-display text-base font-bold text-text">
                  {v != null ? v : '—'}
                  {v != null && (
                    <span className="ml-0.5 text-[10px] font-normal text-faint">{f.unit}</span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {!loading && latest?.measuredOn && (
        <p className="text-center text-[11px] text-faint">最近量測：{latest.measuredOn}</p>
      )}
      {!loading && !latest && !open && (
        <p className="text-center text-xs text-muted">還沒有紀錄，點「記一筆」開始追蹤成長。</p>
      )}

      {/* 新增表單 */}
      {open && (
        <div className="space-y-3 border-t border-border/60 pt-3">
          <div className="grid grid-cols-3 gap-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block text-xs">
                <span className="mb-1 block font-medium text-muted">
                  {f.label}（{f.unit}）
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder="—"
                  aria-label={`${f.label}（${f.unit}）`}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-center text-sm text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ))}
          </div>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-muted">量測日期</span>
            <input
              type="date"
              value={form.measuredOn}
              max={todayISO()}
              onChange={(e) => setForm((s) => ({ ...s, measuredOn: e.target.value }))}
              aria-label="量測日期"
              className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-danger-tint px-3 py-2 text-xs text-danger" role="alert">
              {error}
            </p>
          )}
          <Button size="md" icon="check" loading={saving} onClick={handleSave} className="w-full">
            儲存這筆
          </Button>
        </div>
      )}
    </section>
  )
}
