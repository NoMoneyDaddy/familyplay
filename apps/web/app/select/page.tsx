'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { Button, ErrorAlert, Icon, type IconName, PageHeader, PageShell } from '@/app/components/ui'
import { useChildStore } from '@/lib/stores/useChildStore'

// 家長精力：用電量隱喻（直覺、好懂、適合做成乾淨的線性圖示，取代 emoji）
const ENERGY_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: 'exhausted', label: '累到不行', icon: 'batteryEmpty' },
  { value: 'low', label: '有點累', icon: 'batteryLow' },
  { value: 'medium', label: '還好', icon: 'batteryMid' },
  { value: 'high', label: '精力滿滿', icon: 'batteryFull' },
]

// 現在情境：用情境化的線性圖示（太陽／月亮／情緒雲／體溫計）
const CONTEXT_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: 'normal', label: '正常時光', icon: 'today' },
  { value: 'bedtime', label: '睡前時間', icon: 'moon' },
  { value: 'emotional_crisis', label: '情緒比較激動', icon: 'cloudBolt' },
  { value: 'sick_day', label: '生病/休息日', icon: 'thermometer' },
]

export default function SelectPage() {
  const router = useRouter()
  const { selectedChildId, hasHydrated } = useChildStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 只有在孩子清單載入完成（hasHydrated）後仍沒有孩子，才導向引導頁——
  // 否則首次建立孩子後會在 ChildSwitcher 抓到資料前就被跳回 /onboarding。
  useEffect(() => {
    if (hasHydrated && !selectedChildId) {
      router.push('/onboarding')
    }
  }, [hasHydrated, selectedChildId, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedChildId) return

    const formData = new FormData(e.currentTarget)
    const parentEnergy = formData.get('parentEnergy') as string | null
    const context = formData.get('context') as string | null

    // 以 JS 驗證取代原生 required：精力選項的 radio 為 sr-only（視覺隱藏），
    // 瀏覽器原生 required 驗證會因「不可聚焦」而靜默擋住送出。
    if (!parentEnergy || !context) {
      setError('請先選擇你的精力狀態與現在的情境')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          parentEnergy,
          context,
          availableSpace: 'anywhere',
          availableResources: [],
          maxDurationMinutes: 20,
        }),
      })

      if (res.ok) {
        router.push(
          `/recommendations?childId=${selectedChildId}&parentEnergy=${parentEnergy}&context=${context}`,
        )
      } else {
        setError('獲取方案失敗，請重試')
      }
    } catch {
      setError('發生錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <ChildSwitcher />
      <PageHeader
        title="你今天怎麼樣？"
        subtitle="選擇你的狀態，30 秒拿到陪伴方案"
        align="center"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 精力狀態：原生 radio 群組（sr-only 保留可存取性），卡片以 :has(:checked) 顯示選中 */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text">你的精力狀態</legend>
          <div className="grid grid-cols-2 gap-3">
            {ENERGY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer flex-row items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 shadow-clay-sm transition-all hover:-translate-y-0.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:shadow-clay has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50"
              >
                <input type="radio" name="parentEnergy" value={option.value} className="sr-only" />
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name={option.icon} className="h-[24px] w-[24px]" />
                </span>
                <span className="text-sm font-medium text-text">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 情境 */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-text">現在的情境</legend>
          <div className="grid gap-2.5">
            {CONTEXT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-clay-sm transition-all hover:-translate-y-0.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:shadow-clay has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50"
              >
                <input type="radio" name="context" value={option.value} className="peer sr-only" />
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand peer-checked:bg-card">
                  <Icon name={option.icon} className="h-[22px] w-[22px]" />
                </span>
                <span className="flex-1 text-sm font-medium text-text">{option.label}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border text-transparent peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">
                  <Icon name="check" className="h-[12px] w-[12px]" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* live region 常駐 DOM，僅更新內部文字，確保螢幕報讀器可靠播報 */}
        <ErrorAlert message={error} />

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={!selectedChildId}
          icon="compass"
        >
          給我陪伴方案
        </Button>
      </form>
    </PageShell>
  )
}
