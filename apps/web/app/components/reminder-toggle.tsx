'use client'

import { useEffect, useState } from 'react'
import { disableReminders, enableReminders, getReminderState, isPushConfigured } from '@/lib/push'
import { Card, Icon } from './ui'

// 睡前陪伴提醒開關。未設定 VAPID 或裝置不支援時自動隱藏（休眠）。
export function ReminderToggle() {
  const [state, setState] = useState<'loading' | 'unsupported' | 'denied' | 'on' | 'off'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushConfigured()) {
      setState('unsupported')
      return
    }
    getReminderState().then(setState)
  }, [])

  // 休眠：尚未設定推播或此裝置不支援 → 不顯示，避免給使用者壞掉的開關
  if (state === 'loading' || state === 'unsupported') return null

  const on = state === 'on'

  const toggle = async () => {
    setBusy(true)
    setError(null)
    if (on) {
      await disableReminders()
      setState('off')
    } else {
      const res = await enableReminders()
      if (res.ok) {
        setState('on')
      } else {
        setError(res.error || '開啟失敗')
        setState((await getReminderState()) as typeof state)
      }
    }
    setBusy(false)
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <Icon name="moon" className="h-[20px] w-[20px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text">睡前陪伴提醒</p>
          <p className="text-xs text-muted">當天還沒陪伴時，晚上提醒你（可隨時關閉）</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="睡前陪伴提醒"
          disabled={busy || state === 'denied'}
          onClick={toggle}
          className={`relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            on ? 'bg-brand' : 'bg-border-strong'
          }`}
        >
          <span
            className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-all ${
              on ? 'left-[23px]' : 'left-[3px]'
            }`}
          />
        </button>
      </div>

      {state === 'denied' && (
        <p className="text-xs text-warning" role="alert">
          你已封鎖此網站的通知。請到瀏覽器設定重新允許，才能開啟提醒。
        </p>
      )}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </Card>
  )
}
