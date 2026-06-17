// 陪伴流程各選項的中文標籤與對應值。
// 年齡以「代表月齡」對應推薦引擎的 stageKey；資源/場景值對齊 @familyplay/ai 白名單。

import type { ResourceKey, SpaceContext } from '@familyplay/ai'
import type { CompanionContext, ParentEnergy } from '@familyplay/core'

export interface SelectOption<T> {
  value: T
  label: string
  hint?: string
}

export const AGE_OPTIONS: SelectOption<number>[] = [
  { value: 1, label: '0–3 個月' },
  { value: 4, label: '3–6 個月' },
  { value: 7, label: '6–9 個月' },
  { value: 10, label: '9–12 個月' },
  { value: 15, label: '1–1.5 歲' },
  { value: 21, label: '1.5–2 歲' },
  { value: 30, label: '2–3 歲' },
  { value: 42, label: '3–4 歲' },
  { value: 54, label: '4–5 歲' },
]

export const PARENT_ENERGY_OPTIONS: SelectOption<ParentEnergy>[] = [
  { value: 'low', label: '快沒電了', hint: '想輕鬆一點' },
  { value: 'medium', label: '還可以' },
  { value: 'high', label: '精神不錯', hint: '可以動一動' },
]

export const COMPANION_CONTEXT_OPTIONS: SelectOption<CompanionContext>[] = [
  { value: 'normal', label: '一般時間' },
  { value: 'bedtime', label: '睡前' },
  { value: 'emotional_crisis', label: '鬧情緒' },
  { value: 'sick_day', label: '生病不舒服' },
]

export const SPACE_OPTIONS: SelectOption<SpaceContext>[] = [
  { value: 'anywhere', label: '哪裡都行' },
  { value: 'living_room', label: '客廳' },
  { value: 'bedroom', label: '臥室' },
  { value: 'kitchen', label: '廚房' },
  { value: 'outdoor_yard', label: '院子' },
  { value: 'park', label: '公園' },
  { value: 'car', label: '車上' },
  { value: 'waiting_area', label: '等候/排隊' },
]

export const TIME_OPTIONS: SelectOption<number>[] = [
  { value: 5, label: '5 分鐘' },
  { value: 10, label: '10 分鐘' },
  { value: 15, label: '15 分鐘' },
  { value: 30, label: '30 分鐘' },
]

export const RESOURCE_OPTIONS: SelectOption<ResourceKey>[] = [
  { value: 'books', label: '繪本' },
  { value: 'blocks', label: '積木' },
  { value: 'balls', label: '球' },
  { value: 'paper_crayons', label: '紙跟蠟筆' },
  { value: 'cushions', label: '抱枕' },
  { value: 'music', label: '音樂' },
  { value: 'water', label: '水' },
  { value: 'kitchen_items', label: '廚房小物' },
]
