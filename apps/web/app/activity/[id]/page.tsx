'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useRef, useState } from 'react'
import { Mascot } from '@/app/components/mascot'
import {
  Button,
  Card,
  ErrorAlert,
  FOCUS_LABEL,
  Icon,
  type IconName,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'

interface Activity {
  id: string
  title: string
  openingLine: string
  steps: string[]
  followUpQuestions: string[]
  endingLine?: string
  minDurationMinutes: number
  maxDurationMinutes: number
  developmentalFocus?: string[]
  targetSkills?: string[]
}

type Reaction = 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'
type Outcome = 'completed' | 'tried' | 'abandoned'

const REACTIONS: { value: Reaction; label: string; icon: IconName }[] = [
  { value: 'happy', label: '開心', icon: 'faceHappy' },
  { value: 'engaged', label: '投入', icon: 'sparkle' },
  { value: 'calmed', label: '平靜了', icon: 'heart' },
  { value: 'neutral', label: '普通', icon: 'faceNeutral' },
  { value: 'disinterested', label: '沒興趣', icon: 'faceSad' },
  { value: 'leaving', label: '想離開', icon: 'logout' },
]

const OUTCOMES: { value: Outcome; label: string; icon: IconName }[] = [
  { value: 'completed', label: '完成', icon: 'check' },
  { value: 'tried', label: '嘗試了', icon: 'refresh' },
  { value: 'abandoned', label: '中途放棄', icon: 'x' },
]

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [outcome, setOutcome] = useState<Outcome>('completed')
  const [childReaction, setChildReaction] = useState<Reaction>('happy')
  const [startTime] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 預設只給「記一下」一鍵存（反應＝開心、完成度＝完成）；想細記再展開，降低疲憊家長的負擔。
  const [showDetails, setShowDetails] = useState(false)
  // 記錄成功後的小慶祝（最有成就感的時刻），停留約 1.8 秒再回首頁。
  const [celebrating, setCelebrating] = useState(false)
  const [savedMins, setSavedMins] = useState(0)
  // 收藏（save for later）：掛載後查目前活動是否已收藏；toggle 時樂觀更新。
  const [isSaved, setIsSaved] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 卸載時清掉未觸發的慶祝→導頁計時器，避免回上頁後被非預期導向 /select
  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    },
    [],
  )

  useEffect(() => {
    // fetchWithTimeout 對 4xx/5xx 不 throw；非 2xx（404/401/500）會回 { error: ... }，
    // 直接 setActivity 會讓 !activity 的錯誤畫面失效、後續 activity.steps 崩潰。
    // 故先檢查 res.ok，失敗一律當讀取失敗（null）→ 顯示錯誤畫面與返回鍵。
    fetchWithTimeout(`/api/activities/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setActivity(data?.id ? data : null))
      .catch(() => setActivity(null))
      .finally(() => setActivityLoading(false))
  }, [id])

  useEffect(() => {
    let cancelled = false
    fetchWithTimeout('/api/saved')
      .then((res) => (res.ok ? res.json() : { saved: [] }))
      .then((data) => {
        if (!cancelled) {
          setIsSaved((data.saved ?? []).some((s: { activity_id: string }) => s.activity_id === id))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  const toggleSaved = async () => {
    if (savePending) return
    const next = !isSaved
    setIsSaved(next) // 樂觀更新
    setSavePending(true)
    try {
      const res = next
        ? await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: id }),
          })
        : await fetch(`/api/saved?activityId=${id}`, { method: 'DELETE' })
      if (!res.ok) setIsSaved(!next) // 失敗回復
    } catch {
      setIsSaved(!next)
    } finally {
      setSavePending(false)
    }
  }

  // 返回：優先回上一頁（多半是 /now、/recommendations、/saved）。
  // 用 Next.js App Router 寫在 history.state 的 idx 判斷「站內是否有上一頁」：
  // idx > 0 代表是站內導覽進來的，router.back() 安全；idx 為 0／不存在代表直接開連結
  // （外部連結、重新整理），此時 back() 可能跳出網站，改回 /now。
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) router.back()
    else router.push('/now')
  }

  const handleComplete = async () => {
    // 後端要求 durationSecs 為正整數；秒數可能 < 0.5（快速點擊）四捨五入成 0 而被 400 擋下，
    // 故下限鎖 1 秒。
    const durationSecs = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    const childId = new URLSearchParams(window.location.search).get('childId')

    // 沒有 childId 就送出只會 400 → 先擋下並提示，避免「以為記錄成功」卻什麼都沒存
    if (!childId) {
      setError('找不到孩子資料，請回首頁重新選擇後再記錄。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          activityId: id,
          outcome,
          childReaction,
          durationSecs,
        }),
      })

      // fetch 對 4xx/5xx 不會 throw；必須檢查 res.ok，否則失敗也會被當成成功跳轉
      if (!res.ok) {
        // session 過期最常見也最可行動 → 給明確提示；其餘維持通用訊息（不直接顯示後端英文）
        setError(
          res.status === 401
            ? '登入已過期，請重新登入後再記錄。'
            : '記錄沒有成功，請稍後再試一次。',
        )
        setLoading(false)
        return
      }

      // 成功 → 小慶祝再回首頁（保持 loading，避免覆蓋層後面還能再按）
      setSavedMins(Math.round(durationSecs / 60))
      setCelebrating(true)
      redirectTimer.current = setTimeout(() => router.push('/select'), 1800)
    } catch (err) {
      console.error('Failed to log activity:', err)
      setError('記錄失敗，請檢查網路後再試一次。')
      setLoading(false)
    }
  }

  if (activityLoading) {
    return (
      <PageShell>
        <p className="py-12 text-center text-muted" role="status">
          加載活動中...
        </p>
      </PageShell>
    )
  }

  if (!activity) {
    return (
      <PageShell>
        <button
          type="button"
          onClick={goBack}
          className="-ml-1 inline-flex items-center gap-1 self-start text-sm font-medium text-muted transition-colors hover:text-text"
        >
          <Icon name="back" className="h-[16px] w-[16px]" />
          返回
        </button>
        <p className="py-12 text-center text-danger" role="alert">
          活動不存在或暫時讀取失敗
        </p>
      </PageShell>
    )
  }

  const focusLabels = (activity.developmentalFocus || []).map((f) => FOCUS_LABEL[f]).filter(Boolean)
  // 領域（大動作/語言…）＋ ZPD 目標能力，合併去重成「會練到什麼」標籤
  const learnTags = Array.from(new Set([...focusLabels, ...(activity.targetSkills || [])]))

  return (
    <PageShell>
      {/* 返回：點進活動後可回到原本的清單／首頁 */}
      <button
        type="button"
        onClick={goBack}
        className="-ml-1 inline-flex items-center gap-1 self-start text-sm font-medium text-muted transition-colors hover:text-text"
      >
        <Icon name="back" className="h-[16px] w-[16px]" />
        返回
      </button>

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-text">{activity.title}</h1>
          <button
            type="button"
            onClick={toggleSaved}
            aria-pressed={isSaved}
            aria-label={isSaved ? '取消收藏' : '收藏這個活動'}
            className="-mr-1 shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-brand-tint active:scale-95"
          >
            <Icon
              name="heart"
              className={`h-[24px] w-[24px] ${isSaved ? 'fill-current text-brand' : ''}`}
            />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-brand">{activity.openingLine}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-text">步驟</h2>
            <ol className="space-y-2">
              {activity.steps.map((step, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Activity steps are static and ordered
                <li key={i} className="flex gap-3">
                  <span className="font-semibold text-brand">{i + 1}</span>
                  <span className="text-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {activity.followUpQuestions.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-text">跟進問題</h2>
              <ul className="space-y-1">
                {activity.followUpQuestions.map((q, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Follow-up questions are static and ordered
                  <li key={i} className="text-sm text-muted">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activity.endingLine && (
            <p className="rounded-xl bg-bg px-3 py-2.5 text-sm italic text-muted">
              {activity.endingLine}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Icon name="clock" className="h-[14px] w-[14px]" />約 {activity.minDurationMinutes}–
            {activity.maxDurationMinutes} 分鐘
          </div>
        </div>
      </Card>

      {/* 做這個活動能練到什麼：發展領域 + ZPD 目標能力，讓家長看到陪伴的意義 */}
      {learnTags.length > 0 && (
        <Card className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-tint text-brand">
              <Icon name="sparkle" className="h-[15px] w-[15px]" />
            </span>
            <h2 className="text-sm font-semibold text-text">陪這個，孩子在練</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {learnTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-strong"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-faint">陪玩自然帶到這些能力，不用刻意「教」。</p>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="font-semibold text-text">記一下今天</h2>

        {/* 細記反應／完成度：預設收合，想多寫再展開（多數時候一鍵存就好） */}
        {showDetails ? (
          <>
            {/* 孩子的反應：單選 radio 群組 */}
            <fieldset className="space-y-2">
              <legend className="block text-sm font-semibold text-text">孩子的反應</legend>
              <div className="grid grid-cols-3 gap-2">
                {REACTIONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border/60 bg-card px-1 py-3 text-center text-xs font-medium leading-tight text-text shadow-clay-sm transition-all hover:-translate-y-0.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand-strong has-[:checked]:shadow-clay has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50"
                  >
                    <input
                      type="radio"
                      name="reaction"
                      value={r.value}
                      checked={childReaction === r.value}
                      onChange={() => setChildReaction(r.value)}
                      className="sr-only"
                    />
                    <Icon name={r.icon} className="h-[22px] w-[22px]" />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* 活動完成度：單選 radio 群組 */}
            <fieldset className="space-y-2">
              <legend className="block text-sm font-semibold text-text">活動完成度</legend>
              <div className="grid grid-cols-3 gap-2">
                {OUTCOMES.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border/60 bg-card px-1 py-3 text-center text-xs font-medium leading-tight text-text shadow-clay-sm transition-all hover:-translate-y-0.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand-strong has-[:checked]:shadow-clay has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50"
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={o.value}
                      checked={outcome === o.value}
                      onChange={() => setOutcome(o.value)}
                      className="sr-only"
                    />
                    <Icon name={o.icon} className="h-[18px] w-[18px]" />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 py-2.5 text-sm font-medium text-muted transition-colors hover:text-brand"
          >
            <Icon name="edit" className="h-[16px] w-[16px]" />
            想記下孩子的反應？
          </button>
        )}

        <ErrorAlert message={error} />

        <Button type="button" onClick={handleComplete} loading={loading} size="lg" icon="check">
          {loading ? '記錄中...' : '記一下 ✓'}
        </Button>
        {!showDetails && (
          <p className="text-center text-xs text-faint">會記為「完成 · 開心」，想改可展開上面</p>
        )}
      </Card>

      {/* 記錄成功的小慶祝：波波鼓掌 + 鼓勵語，停留約 1.8 秒。
          這是最重要的確認時刻——加 role="status"/aria-live 讓螢幕報讀器也聽得到，
          並把焦點移到覆蓋層，避免焦點還停在被蓋住的按鈕上。 */}
      {celebrating && (
        <div
          ref={(el) => {
            // inline ref 在每次 re-render 會先以 null 再以節點呼叫；只在尚未聚焦時
            // 才 focus，避免 1.8 秒內反覆奪取焦點。
            if (el && document.activeElement !== el) el.focus()
          }}
          tabIndex={-1}
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg/95 px-8 text-center outline-none backdrop-blur-sm"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-[30px] bg-[image:var(--gradient-brand)] shadow-brand ring-4 ring-brand-tint motion-safe:animate-bounce">
            <Mascot className="h-16 w-16" />
          </span>
          <p className="font-display text-xl font-bold text-text">記下來了！</p>
          <p className="text-muted">
            {savedMins >= 1 ? `今天也陪了寶寶 ${savedMins} 分鐘，` : ''}你做得很好 ☁️
          </p>
        </div>
      )}
    </PageShell>
  )
}
