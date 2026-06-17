'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChildSwitcher } from '@/app/components/child-switcher'
import { useChildStore } from '@/lib/stores/useChildStore'

export default function SelectPage() {
  const router = useRouter()
  const { selectedChildId } = useChildStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedChildId) {
      router.push('/onboarding')
    }
  }, [selectedChildId, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedChildId) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const parentEnergy = formData.get('parentEnergy') as string
    const context = formData.get('context') as string

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
        alert('獲取方案失敗，請重試')
      }
    } catch (error) {
      alert('發生錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <ChildSwitcher />
      <div className="mx-auto max-w-[480px] space-y-8 pt-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">你今天怎麼樣？</h1>
          <p className="text-[--color-muted]">選擇你的狀態，30 秒拿到陪伴方案</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="block text-sm font-semibold text-[--color-text]">你的精力狀態</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'exhausted', label: '累到不行 😴', emoji: '😴' },
                { value: 'low', label: '有點累 😑', emoji: '😑' },
                { value: 'medium', label: '還好 😐', emoji: '😐' },
                { value: 'high', label: '精力滿滿 ⚡', emoji: '⚡' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    const input = document.querySelector(
                      `input[value="${option.value}"]`,
                    ) as HTMLInputElement
                    if (input) input.checked = true
                  }}
                  className="rounded-lg border-2 border-[--color-border] p-3 text-center transition-all hover:border-[--color-brand]"
                >
                  <div className="text-2xl">{option.emoji}</div>
                  <div className="text-xs font-medium text-[--color-text]">{option.label}</div>
                  <input
                    type="radio"
                    name="parentEnergy"
                    value={option.value}
                    className="hidden"
                    required
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="block text-sm font-semibold text-[--color-text]">現在的情境</div>
            <div className="grid gap-2">
              {[
                { value: 'normal', label: '正常時光 ☀️' },
                { value: 'bedtime', label: '睡前時間 🌙' },
                { value: 'emotional_crisis', label: '情緒比較激動 😤' },
                { value: 'sick_day', label: '生病/休息日 🤒' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-lg border border-[--color-border] p-3 hover:bg-[--color-bg]"
                >
                  <input
                    type="radio"
                    name="context"
                    value={option.value}
                    className="h-4 w-4"
                    required
                  />
                  <span className="text-sm font-medium text-[--color-text]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedChildId}
            className="w-full rounded-xl bg-[--color-brand] py-4 text-lg font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            {loading ? '取得中...' : '🎯 給我陪伴方案'}
          </button>
        </form>

        <p className="text-center text-xs text-[--color-muted]">Sprint 3 — 選擇狀態</p>
      </div>
    </main>
  )
}
