'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ChildFormProps {
  initialNickname?: string
  initialBirthYear?: string
  initialBirthMonth?: string
  childId?: string
  onSuccess?: () => void
}

export function ChildForm({
  initialNickname = '',
  initialBirthYear = '',
  initialBirthMonth = '',
  childId,
  onSuccess,
}: ChildFormProps) {
  const router = useRouter()
  const [nickname, setNickname] = useState(initialNickname)
  const [birthMonth, setBirthMonth] = useState(initialBirthMonth)
  const [birthYear, setBirthYear] = useState(initialBirthYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!childId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const method = isEditMode ? 'PUT' : 'POST'
      const url = isEditMode ? `/api/children/${childId}` : '/api/children'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          birthYearMonth: `${birthYear}-${String(birthMonth).padStart(2, '0')}`,
        }),
      })

      if (res.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/children')
        }
      } else {
        const data = await res.json()
        setError(data.error || '操作失敗，請重試')
      }
    } catch (err) {
      setError('發生錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      {/* live region 常駐 DOM，僅以樣式切換顯示 */}
      <div
        role="alert"
        className={error ? 'rounded-lg bg-red-50 p-3 text-sm text-red-700' : 'sr-only'}
      >
        {error}
      </div>

      <div className="space-y-2">
        <label htmlFor="nickname" className="block text-sm font-semibold text-[--color-text]">
          孩子的暱稱
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="例：小寶、Amy"
          required
          className="w-full rounded-lg border border-[--color-border] px-4 py-2"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-semibold text-[--color-text]">出生年月</legend>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
            aria-label="出生年份"
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
            aria-label="出生月份"
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
      </fieldset>

      <button
        type="submit"
        disabled={loading || !nickname || !birthYear || !birthMonth}
        className="w-full rounded-lg bg-[--color-brand] py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading
          ? isEditMode
            ? '更新中...'
            : '建立中...'
          : isEditMode
            ? '✨ 更新孩子'
            : '✨ 開始陪伴'}
      </button>
    </form>
  )
}
