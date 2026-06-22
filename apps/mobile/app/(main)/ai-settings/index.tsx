import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type MobileAIProvider, useAIKeyStore } from '@/lib/ai-key'
import { clayCard, colors } from '@/lib/theme'

// 手機端「用你自己的 AI 帳號」設定。金鑰只加密存在這台裝置（SecureStore）、不上傳、不寫資料庫。
const PROVIDERS: { value: MobileAIProvider; label: string; hint: string }[] = [
  { value: 'gemini', label: 'Google Gemini', hint: '有免費額度' },
  { value: 'groq', label: 'Groq', hint: '有免費額度' },
  { value: 'openai', label: 'OpenAI', hint: 'ChatGPT 的公司' },
]

export default function AiSettingsScreen() {
  const router = useRouter()
  const { config, hydrated, hydrate, save, clear } = useAIKeyStore()

  const [provider, setProvider] = useState<MobileAIProvider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  // 還原已存設定（只在 hydrate 完成後帶入一次）
  useEffect(() => {
    if (hydrated && config) {
      setProvider(config.provider)
      setApiKey(config.apiKey)
      setModel(config.model ?? '')
      setSaved(true)
    }
  }, [hydrated, config])

  const handleSave = async () => {
    setError('')
    const trimmed = apiKey.trim()
    if (!trimmed) {
      setError('請先貼上你的 AI 金鑰')
      return
    }
    const ok = await save({ provider, apiKey: trimmed, model: model.trim() || undefined })
    if (ok) setSaved(true)
    else setError('這台裝置無法儲存，請稍後再試')
  }

  const handleClear = () => {
    clear()
    setApiKey('')
    setModel('')
    setProvider('gemini')
    setSaved(false)
    setError('')
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>
            用你自己的 AI 帳號
          </Text>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/now'))}
            accessibilityRole="button"
            accessibilityLabel="返回"
            className="active:opacity-70"
          >
            <Text className="text-sm" style={{ color: colors.muted }}>
              返回
            </Text>
          </Pressable>
        </View>
        <Text className="mb-5 text-sm leading-relaxed" style={{ color: colors.muted }}>
          活動都玩過了，可以請 AI 依孩子的程度想一個全新的。免費功能，用你自己在 AI
          網站申請的金鑰即可。
        </Text>

        {/* 選一個 AI 服務 */}
        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>
          選一個 AI 服務
        </Text>
        <View className="mb-5 gap-2">
          {PROVIDERS.map((p) => {
            const active = provider === p.value
            return (
              <Pressable
                key={p.value}
                onPress={() => {
                  setProvider(p.value)
                  setSaved(false)
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="flex-row items-center justify-between rounded-2xl p-4 active:opacity-90"
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.brand : colors.border,
                }}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold" style={{ color: colors.text }}>
                    {p.label}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>
                    {p.hint}
                  </Text>
                </View>
                {active ? (
                  <Text className="text-base font-bold" style={{ color: colors.brand }}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>

        {/* AI 金鑰 */}
        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>
          AI 金鑰（像密碼一樣的一串字）
        </Text>
        <TextInput
          value={apiKey}
          onChangeText={(t) => {
            setApiKey(t)
            setSaved(false)
          }}
          placeholder="貼上你的金鑰"
          placeholderTextColor={colors.faint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
          }}
        />
        <Text className="mb-4 mt-1.5 text-xs" style={{ color: colors.muted }}>
          到上面選的 AI 服務網站免費申請，複製那串金鑰貼上即可。
        </Text>

        {/* 模型名稱（選填） */}
        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>
          模型名稱（選填）
        </Text>
        <TextInput
          value={model}
          onChangeText={(t) => {
            setModel(t)
            setSaved(false)
          }}
          placeholder="留空用預設"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
          }}
        />
        <Text className="mb-5 mt-1.5 text-xs" style={{ color: colors.muted }}>
          進階選項。填入你選的 AI 服務的模型名稱（可在該服務的文件查到）；不確定就留空。
        </Text>

        {error ? (
          <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: colors.dangerTint }}>
            <Text className="text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          className="mb-3 items-center rounded-2xl py-4 active:opacity-90"
          style={{ backgroundColor: colors.brand }}
        >
          <Text className="text-base font-bold text-white">{saved ? '已儲存 ✓' : '儲存'}</Text>
        </Pressable>

        {config ? (
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            className="items-center py-3 active:opacity-70"
          >
            <Text className="text-sm font-medium" style={{ color: colors.danger }}>
              清除金鑰
            </Text>
          </Pressable>
        ) : null}

        <View
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: colors.brandTint, ...clayCard }}
        >
          <Text className="text-xs leading-relaxed" style={{ color: colors.text }}>
            🔒 金鑰只加密存在這台手機，不會上傳、不寫進資料庫。生成時才送到你選的 AI
            服務、用完即丟。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
