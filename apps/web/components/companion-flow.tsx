'use client'

import { useCompanionStore } from '@/lib/companion-store'
import {
  AGE_OPTIONS,
  COMPANION_CONTEXT_OPTIONS,
  PARENT_ENERGY_OPTIONS,
  RESOURCE_OPTIONS,
  SPACE_OPTIONS,
  TIME_OPTIONS,
} from '@/lib/options'
import { useRecommendations } from '@/lib/use-recommendations'
import { ActivityCard } from './activity-card'
import { MultiOptionGroup } from './multi-option-group'
import { OptionGroup } from './option-group'

export function CompanionFlow() {
  const store = useCompanionStore()
  const mutation = useRecommendations()

  const handleSubmit = () => {
    const body = store.toRequestBody()
    if (body) mutation.mutate(body)
  }

  const result = mutation.data

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[--color-text]">今天可以這樣陪</h2>
          <button
            type="button"
            onClick={() => mutation.reset()}
            className="text-sm text-[--color-brand] underline"
          >
            重新選擇
          </button>
        </div>

        {result.usedFallback ? (
          <p className="text-sm text-[--color-muted]">先給你一個一定能開始的方案 🙂</p>
        ) : null}

        {result.recommendations.map((scored, index) => (
          <ActivityCard key={scored.activity.id} scored={scored} primary={index === 0} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <OptionGroup
        legend="孩子大概幾歲？"
        options={AGE_OPTIONS}
        value={store.ageMonths}
        onChange={store.setAgeMonths}
      />
      <OptionGroup
        legend="你現在的狀態？"
        options={PARENT_ENERGY_OPTIONS}
        value={store.parentEnergy}
        onChange={store.setParentEnergy}
      />
      <OptionGroup
        legend="現在是什麼情況？"
        options={COMPANION_CONTEXT_OPTIONS}
        value={store.companionContext}
        onChange={store.setCompanionContext}
      />
      <OptionGroup
        legend="在哪裡？"
        options={SPACE_OPTIONS}
        value={store.space}
        onChange={store.setSpace}
      />
      <OptionGroup
        legend="有多少時間？"
        options={TIME_OPTIONS}
        value={store.availableMinutes}
        onChange={store.setAvailableMinutes}
      />
      <MultiOptionGroup
        legend="手邊有什麼？（可複選，可不選）"
        options={RESOURCE_OPTIONS}
        values={store.availableResources}
        onToggle={store.toggleResource}
      />

      {mutation.isError ? (
        <p role="alert" className="text-sm text-red-600">
          {(mutation.error as Error).message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!store.isReady() || mutation.isPending}
        onClick={handleSubmit}
        aria-label="拿到陪伴方案"
        className="w-full rounded-xl bg-[--color-brand] py-4 text-lg font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
      >
        {mutation.isPending ? '幫你想想…' : '🧡 拿到陪伴方案'}
      </button>

      {!store.isReady() ? (
        <p className="text-center text-xs text-[--color-muted]">選好年齡、狀態、時間就能開始</p>
      ) : null}
    </div>
  )
}
