'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { hasAIKey, readAIKey } from '@/lib/ai-key'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { Button, Card, Icon } from './ui'

interface GeneratedActivity {
  title: string
  openingLine: string
  steps: string[]
  followUpQuestions: string[]
  endingLine: string
}

// 睡前時段給安撫型、其餘給一般玩耍——對應 AIInput.companionType 白名單
function timeCompanionType(): string {
  const hour = new Date().getHours()
  return hour >= 19 || hour < 5 ? 'calm_down' : 'play'
}

/**
 * 「都看過了」出口：用家長自帶的金鑰請 AI 生一個全新活動。
 * 沒設定金鑰時引導去設定頁；任何失敗都安靜給溫和訊息（後端已降回規則式，不洩漏細節）。
 */
export function AIGenerateCard({ childId }: { childId: string }) {
  const [activity, setActivity] = useState<GeneratedActivity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 掛載後才讀 sessionStorage：避免 SSR（伺服器無 sessionStorage）與客戶端 hydration 不一致。
  // 回到分頁時重讀，使在設定頁存/清金鑰後 CTA 即時更新。
  const [configured, setConfigured] = useState(false)
  useEffect(() => {
    const refresh = () => setConfigured(hasAIKey())
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const generate = async () => {
    if (loading) return // 重入保護：避免快速連點觸發多個並發請求
    const key = readAIKey()
    if (!key) {
      setError('還沒設定 AI 金鑰，先去設定頁加上吧。')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithTimeout(
        '/api/ai/activity',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            parentEnergy: 'low',
            companionType: timeCompanionType(),
            spaceContext: 'anywhere',
            availableResources: [],
            provider: key.provider,
            apiKey: key.apiKey,
          }),
        },
        20000,
      )
      const data = await res.json()
      if (data.ok && data.activity) {
        setActivity(data.activity as GeneratedActivity)
      } else {
        // ok:false（金鑰無效/額度用盡/安全擋下/解析失敗…）一律給同一句溫和訊息
        setError('這次沒生成成功，可能是金鑰或額度問題，稍後再試或換個服務。')
      }
    } catch {
      setError('網路不太穩，等一下再試一次。')
    } finally {
      setLoading(false)
    }
  }

  if (activity) {
    return (
      <Card className="space-y-4 text-left ring-2 ring-brand/40">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-tint text-brand">
            <Icon name="sparkle" className="h-[15px] w-[15px]" />
          </span>
          <span className="text-xs font-semibold text-brand-strong">AI 為你生的</span>
        </div>
        <h2 className="text-xl font-bold leading-snug text-text">{activity.title}</h2>
        {activity.openingLine && (
          <p className="text-lg font-semibold text-brand">{activity.openingLine}</p>
        )}
        <ol className="space-y-2">
          {(activity.steps ?? []).map((step, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: AI 步驟靜態且有序
            <li key={i} className="flex gap-3">
              <span className="font-semibold text-brand">{i + 1}</span>
              <span className="text-text">{step}</span>
            </li>
          ))}
        </ol>
        {Array.isArray(activity.followUpQuestions) && activity.followUpQuestions.length > 0 && (
          <ul className="space-y-1">
            {activity.followUpQuestions.map((q, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: AI 問題靜態且有序
              <li key={i} className="text-sm text-muted">
                • {q}
              </li>
            ))}
          </ul>
        )}
        {activity.endingLine && (
          <p className="rounded-xl bg-bg px-3 py-2.5 text-sm italic text-muted">
            {activity.endingLine}
          </p>
        )}
        <p className="text-xs text-faint">AI 生成、未經編審；請依現場狀況斟酌安全。</p>
        {/* 再生失敗時也要顯示訊息，避免靜默無回饋 */}
        {error && (
          <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-warning" role="status">
            {error}
          </p>
        )}
        <Button variant="secondary" size="md" icon="refresh" loading={loading} onClick={generate}>
          再生一個
        </Button>
      </Card>
    )
  }

  return (
    <Card className="space-y-3 py-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand">
        <Icon name="sparkle" className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-text">都看過了？請 AI 生一個</p>
        <p className="text-sm text-muted">依孩子的程度，現場生一個全新的小活動。</p>
      </div>
      {error && (
        <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-warning" role="status">
          {error}
        </p>
      )}
      {configured ? (
        <Button size="lg" icon="sparkle" loading={loading} onClick={generate} className="w-full">
          請 AI 生一個
        </Button>
      ) : (
        <Link
          href="/settings"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-brand transition-opacity hover:opacity-70"
        >
          <Icon name="settings" className="h-[16px] w-[16px]" />
          先到設定加上你的 AI 金鑰
        </Link>
      )}
    </Card>
  )
}
