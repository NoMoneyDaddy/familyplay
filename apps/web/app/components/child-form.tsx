'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, ErrorAlert, Field, Select, TextInput } from './ui'

interface ChildFormProps {
  initialNickname?: string
  initialBirthYear?: string
  initialBirthMonth?: string
  initialBirthDay?: string
  childId?: string
  /** 建立/更新成功後呼叫。建立模式會把新孩子的 id 與暱稱回傳（方便選為當前孩子/連續新增）。 */
  onSuccess?: (child?: { nickname: string; childId?: string }) => void
  submitLabel?: string
}

export function ChildForm({
  initialNickname = '',
  initialBirthYear = '',
  initialBirthMonth = '',
  initialBirthDay = '',
  childId,
  onSuccess,
  submitLabel,
}: ChildFormProps) {
  const router = useRouter()
  const [nickname, setNickname] = useState(initialNickname)
  const [birthMonth, setBirthMonth] = useState(initialBirthMonth)
  const [birthYear, setBirthYear] = useState(initialBirthYear)
  // 出生「日」選填：填了就精確到日，年齡安全過濾/階段判斷更準；留空則只到月。
  const [birthDay, setBirthDay] = useState(initialBirthDay)
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

      const ym = `${birthYear}-${String(birthMonth).padStart(2, '0')}`
      // 有選日 → 精確生日 YYYY-MM-DD；編輯模式留空則送 '' 代表「清除精確日、回到只到月」。
      const birthDate = birthDay
        ? `${ym}-${String(birthDay).padStart(2, '0')}`
        : isEditMode
          ? ''
          : undefined
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          birthYearMonth: ym,
          ...(birthDate !== undefined ? { birthDate } : {}),
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
          setBirthDay('')
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
  // 該年月實際天數（閏年自動正確）；未選齊年月時給 31 天讓使用者先挑。
  const daysInMonth =
    birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31
  // 換月後若所選「日」超過該月天數（如 1/31→2 月），清掉避免組出無效日期。
  useEffect(() => {
    if (birthDay && Number(birthDay) > daysInMonth) setBirthDay('')
  }, [birthDay, daysInMonth])

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
        <legend className="mb-2 block text-sm font-semibold text-text">
          出生年月日 <span className="font-normal text-faint">（日選填）</span>
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <Select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
            aria-label="出生年份"
          >
            <option value="">年</option>
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
            <option value="">月</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month} 月
              </option>
            ))}
          </Select>
          <Select
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            aria-label="出生日（選填）"
          >
            <option value="">日</option>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day} 日
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-muted">填到「日」可讓年齡與推薦更精準；只填年月也可以。</p>
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
