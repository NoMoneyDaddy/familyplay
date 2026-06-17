'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { useChildStore } from '@/lib/stores/useChildStore'

const ENERGY_OPTIONS = [
  { value: 'exhausted', label: '累到不行', emoji: '😴' },
  { value: 'low', label: '有點累', emoji: '😑' },
  { value: 'medium', label: '還好', emoji: '😐' },
  { value: 'high', label: '精力滿滿', emoji: '⚡' },
]

const CONTEXT_OPTIONS = [
  { value: 'normal', label: '正常時光', emoji: '☀️' },
  { value: 'bedtime', label: '睡前時間', emoji: '🌙' },
  { value: 'emotional_crisis', label: '情緒比較激動', emoji: '😤' },
  { value: 'sick_day', label: '生病/休息日', emoji: '🤒' },
]

export default function SelectPage() {
  const router = useRouter()
  const { selectedChildId } = useChildStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedChildId) {
      router.push('/onboarding')
    }
  }, [selectedChildId, router])

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
    <main className="min-h-screen bg-gradient-to-b from-bg to-white px-5 py-8">
      <ChildSwitcher />
      <div className="mx-auto max-w-[480px] space-y-8 pt-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-brand">你今天怎麼樣？</h1>
          <p className="text-muted">選擇你的狀態，30 秒拿到陪伴方案</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 精力狀態：原生 radio 群組（sr-only 保留可存取性），卡片以 :has(:checked) 顯示選中 */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text">你的精力狀態</legend>
            <div className="grid grid-cols-2 gap-3">
              {ENERGY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-border p-3 text-center transition-all hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-bg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
                >
                  <input
                    type="radio"
                    name="parentEnergy"
                    value={option.value}
                    className="sr-only"
                  />
                  <span className="text-2xl" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="text-xs font-medium text-text">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 情境 */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text">現在的情境</legend>
            <div className="grid gap-2">
              {CONTEXT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-bg has-[:checked]:border-brand has-[:checked]:bg-bg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
                >
                  <input
                    type="radio"
                    name="context"
                    value={option.value}
                    className="h-4 w-4 accent-brand focus:outline-none"
                  />
                  <span aria-hidden="true">{option.emoji}</span>
                  <span className="text-sm font-medium text-text">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* live region 常駐 DOM，僅更新內部文字，確保螢幕報讀器可靠播報 */}
          <div role="alert" aria-live="assertive">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedChildId}
            className="w-full rounded-xl bg-brand py-4 text-lg font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            {loading ? '取得中…' : '🎯 給我陪伴方案'}
          </button>
        </form>
      </div>
    </main>
  )
}
