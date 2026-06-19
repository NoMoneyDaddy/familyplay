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
 * 「都看過了」出口：請 AI 生一個全新活動。
 * Plus 會員用伺服器託管金鑰（免設定、計月配額）；其餘用家長自帶金鑰(BYO)。
 * 都沒有時引導去設定／升級；任何失敗都安靜給溫和訊息（後端已降回規則式，不洩漏細節）。
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

  // Plus 會員可用「託管金鑰」免設定生成；查方案決定要不要直接給生成按鈕。
  // 只在成功讀到方案時更新（暫時的網路/DB 錯誤不要把 Plus 誤判成非 Plus 而藏掉入口）；
  // 回到分頁時重讀，讓升級/掉訂後即時反映。後端仍以配額把關，前端判斷僅影響顯示。
  const [isPlus, setIsPlus] = useState(false)
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      fetch('/api/profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d && typeof d.plan === 'string') setIsPlus(d.plan === 'plus')
        })
        .catch(() => {})
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const generate = async () => {
    if (loading) return // 重入保護：避免快速連點觸發多個並發請求
    // 有自帶金鑰(BYO)就帶上；沒有則不帶 provider → 伺服器走 Plus 託管金鑰並計配額。
    // 非 Plus／未配置託管時伺服器回 ok:false，前端統一給溫和訊息。
    const key = readAIKey()
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
            ...(key ? { provider: key.provider, apiKey: key.apiKey } : {}),
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
        <p className="text-sm text-muted">
          {isPlus ? 'Plus 免設定，依孩子的程度生一個。' : '依孩子的程度，現場生一個全新的小活動。'}
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-warning" role="status">
          {error}
        </p>
      )}
      {configured || isPlus ? (
        <>
          <Button size="lg" icon="sparkle" loading={loading} onClick={generate} className="w-full">
            請 AI 生一個
          </Button>
          {/* Plus 用託管金鑰、免自帶；非 Plus 才需要自帶金鑰 */}
          {!configured && (
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-1 text-xs text-muted transition-opacity hover:opacity-70"
            >
              或自帶 AI 金鑰
            </Link>
          )}
        </>
      ) : (
        <Link
          href="/settings"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-brand transition-opacity hover:opacity-70"
        >
          <Icon name="settings" className="h-[16px] w-[16px]" />
          先到設定加上你的 AI 金鑰（或升級 Plus 免設定）
        </Link>
      )}
    </Card>
  )
}
