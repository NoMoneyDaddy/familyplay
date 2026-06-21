'use client'

import { useEffect, useState } from 'react'
import { type AIProviderChoice, clearAIKey, readAIKey, saveAIKey } from '@/lib/ai-key'
import { Button, Callout, Card, Field, Select, TextInput } from './ui'

// 自帶 AI 金鑰（BYO key）設定區。讓免費版家長貼自己的 provider 金鑰，
// 用來在「都看過了」時請 AI 生一個全新活動。金鑰只存 sessionStorage（見 lib/ai-key）。

const PROVIDER_OPTIONS: { value: AIProviderChoice; label: string; needsKey: boolean }[] = [
  { value: 'gemini', label: 'Google Gemini（有免費額度）', needsKey: true },
  { value: 'groq', label: 'Groq（有免費額度）', needsKey: true },
  { value: 'openai', label: 'OpenAI（ChatGPT 的公司）', needsKey: true },
  { value: 'ollama', label: 'Ollama（裝在自己電腦，免申請）', needsKey: false },
]

export function AIKeySettings() {
  const [provider, setProvider] = useState<AIProviderChoice>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // 掛載後讀取目前設定（避免 SSR/hydration 不一致）
  useEffect(() => {
    const cur = readAIKey()
    if (cur) {
      setProvider(cur.provider)
      setApiKey(cur.apiKey ?? '')
      setSaved(true)
    }
    setHydrated(true)
  }, [])

  const needsKey = PROVIDER_OPTIONS.find((p) => p.value === provider)?.needsKey ?? true

  const handleSave = () => {
    // 依實際寫入結果更新狀態：隱私模式/封鎖儲存時 saveAIKey 回 false，別假報「已儲存」
    const ok = saveAIKey({ provider, apiKey: needsKey ? apiKey.trim() : undefined })
    setSaved(ok)
    setSaveError(
      ok ? null : '這個瀏覽器沒辦法幫你記住，可能開了無痕模式。換個瀏覽器或關掉無痕再試一次。',
    )
  }

  const handleClear = () => {
    clearAIKey()
    setApiKey('')
    setProvider('gemini')
    setSaved(false)
  }

  const canSave = !needsKey || apiKey.trim().length > 0

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-semibold text-text">AI 客製活動（用你自己的 AI 帳號）</h3>
        <p className="mt-1 text-xs text-muted">
          活動都玩過了，可以請 AI 依孩子的程度想一個全新的。免費功能，用你自己在 AI
          網站申請的金鑰即可。
        </p>
      </div>

      <Field label="選一個 AI 服務" htmlFor="ai-provider">
        <Select
          id="ai-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as AIProviderChoice)
            setSaved(false)
          }}
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      {needsKey && (
        <Field label="AI 金鑰（像密碼一樣的一串字）" htmlFor="ai-key">
          <TextInput
            id="ai-key"
            type="password"
            autoComplete="off"
            placeholder="貼上你的金鑰"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setSaved(false)
            }}
          />
          <p className="mt-1.5 text-xs text-muted">
            到上面選的 AI 服務網站（如 Google Gemini）免費申請，複製那串金鑰貼上即可。
          </p>
        </Field>
      )}

      <div className="flex gap-2">
        <Button size="md" icon="check" className="flex-1" disabled={!canSave} onClick={handleSave}>
          {saved ? '已儲存' : '儲存'}
        </Button>
        {saved && (
          <Button size="md" variant="ghost" icon="trash" onClick={handleClear}>
            清除
          </Button>
        )}
      </div>

      {saveError && (
        <p className="rounded-lg bg-danger-tint px-3 py-2 text-xs text-danger" role="alert">
          {saveError}
        </p>
      )}

      {hydrated && (
        <Callout tone="tip" title="金鑰只留在這台裝置">
          金鑰只存在這個瀏覽器分頁、關閉就清除，
          <strong className="text-text">不會上傳、不寫進資料庫</strong>
          。每次生成才送到伺服器、用完即丟。
        </Callout>
      )}
    </Card>
  )
}
