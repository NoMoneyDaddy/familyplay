'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, ErrorAlert, Field, Select, TextInput } from './ui'

interface ChildFormProps {
  initialNickname?: string
  initialBirthYear?: string
  initialBirthMonth?: string
  childId?: string
  /** 建立/更新成功後呼叫。建立模式會把新孩子的 id 與暱稱回傳（方便選為當前孩子/連續新增）。 */
  onSuccess?: (child?: { nickname: string; childId?: string }) => void
  submitLabel?: string
}

export function ChildForm({
  initialNickname = '',
  initialBirthYear = '',
  initialBirthMonth = '',
  childId,
  onSuccess,
  submitLabel,
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
        let childId: string | undefined
        try {
          childId = (await res.json())?.childId
        } catch {
          // 更新模式可能無回傳 body，忽略
        }
        const created = { nickname, childId }
        // 建立模式：清空表單，方便連續新增下一個孩子
        if (!isEditMode) {
          setNickname('')
          setBirthYear('')
          setBirthMonth('')
        }
        if (onSuccess) {
          onSuccess(created)
        } else {
          router.push('/children')
        }
      } else {
        const data = await res.json()
        setError(data.error || '操作失敗，請重試')
      }
    } catch {
      setError('發生錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  const thisYear = new Date().getFullYear()

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <ErrorAlert message={error} />

      <Field label="孩子的暱稱" htmlFor="nickname">
        <TextInput
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="例：小寶、Amy"
          required
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="mb-2 block text-sm font-semibold text-text">出生年月</legend>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
            aria-label="出生年份"
          >
            <option value="">年份</option>
            {Array.from({ length: 10 }, (_, i) => thisYear - i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          <Select
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            required
            aria-label="出生月份"
          >
            <option value="">月份</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month} 月
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-muted">我們只記錄年月，不記錄完整生日</p>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        loading={loading}
        disabled={!nickname || !birthYear || !birthMonth}
      >
        {submitLabel ?? (isEditMode ? '更新孩子' : '建立孩子')}
      </Button>
    </form>
  )
}
