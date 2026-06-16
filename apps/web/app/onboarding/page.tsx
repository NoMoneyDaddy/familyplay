'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OnboardingPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          birthYearMonth: `${birthYear}-${String(birthMonth).padStart(2, '0')}`,
        }),
      })

      if (res.ok) {
        router.push('/select')
      } else {
        alert('失敗，請重試')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6 pt-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">認識你的孩子</h1>
          <p className="text-[--color-muted]">讓我們為你準備最適合的陪伴方案</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[--color-text]">孩子的暱稱</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：小寶、Amy"
              required
              className="w-full rounded-lg border border-[--color-border] px-4 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[--color-text]">出生年月</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                required
                className="rounded-lg border border-[--color-border] px-4 py-2"
              >
                <option value="">年份</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                required
                className="rounded-lg border border-[--color-border] px-4 py-2"
              >
                <option value="">月份</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {month} 月
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[--color-muted]">我們只記錄年月，不記錄完整生日</p>
          </div>

          <button
            type="submit"
            disabled={loading || !nickname || !birthYear || !birthMonth}
            className="w-full rounded-lg bg-[--color-brand] py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? '建立中...' : '✨ 開始陪伴'}
          </button>
        </form>

        <p className="text-center text-xs text-[--color-muted]">你可以之後新增更多孩子</p>
      </div>
    </main>
  )
}
