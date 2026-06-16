import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SelectPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    redirect('/auth')
  }

  const { data: children } = await supabase.from('child_profiles').select('id,nickname').limit(1)

  if (!children || children.length === 0) {
    redirect('/onboarding')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">你今天怎麼樣？</h1>
          <p className="text-[--color-muted]">選擇你的狀態，30 秒拿到陪伴方案</p>
        </div>

        <form method="POST" action="/api/recommend" className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[--color-text]">你的精力狀態</label>
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
            <label className="block text-sm font-semibold text-[--color-text]">現在的情境</label>
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
            className="w-full rounded-xl bg-[--color-brand] py-4 text-lg font-bold text-white transition-transform active:scale-[0.97]"
          >
            🎯 給我陪伴方案
          </button>
        </form>

        <p className="text-center text-xs text-[--color-muted]">Sprint 3 — 選擇狀態</p>
      </div>
    </main>
  )
}
