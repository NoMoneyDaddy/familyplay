'use client'

import { useEffect, useState } from 'react'
import { Icon, type IconName } from './ui'

// 首次到 /now 的一次性上手提示。疲憊家長導向：極簡、可一鍵關、看過就不再出現。
// 用 localStorage 記住「看過」；隱私模式可能 throw，全包 try-catch。

const SEEN_KEY = 'fp_seen_intro'

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // 讀不到就當作看過，避免每次都跳
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {}
}

const STEPS: { icon: IconName; text: string }[] = [
  { icon: 'today', text: '幫你選好一個現在就能玩的，直接開始' },
  { icon: 'refresh', text: '不喜歡就「換一個」，玩完一鍵記一下' },
  { icon: 'sparkle', text: '都看過了？標里程碑或請 AI 生新的' },
]

export function FirstRunHint() {
  // 掛載後才讀 localStorage（避免 SSR/hydration 不一致與首屏閃動）
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!readSeen()) setShow(true)
  }, [])

  if (!show) return null

  const dismiss = () => {
    markSeen()
    setShow(false)
  }

  return (
    <section
      aria-label="快速上手"
      className="relative space-y-3 rounded-2xl border border-brand/20 bg-brand-tint/40 p-4"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="關閉提示"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted transition-colors hover:bg-card hover:text-text"
      >
        <Icon name="x" className="h-[16px] w-[16px]" />
      </button>

      <p className="pr-6 text-sm font-semibold text-text">歡迎！三步就會用 ☁️</p>
      <ul className="space-y-2">
        {STEPS.map((s) => (
          <li key={s.text} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-card text-brand">
              <Icon name={s.icon} className="h-[15px] w-[15px]" />
            </span>
            <span className="text-sm leading-relaxed text-text">{s.text}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={dismiss}
        className="w-full rounded-xl bg-card py-2 text-sm font-medium text-brand-strong shadow-clay-sm transition-colors hover:bg-bg"
      >
        知道了，開始陪
      </button>
    </section>
  )
}
