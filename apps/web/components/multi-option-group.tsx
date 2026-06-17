'use client'

import type { SelectOption } from '@/lib/options'

interface Props<T extends string> {
  legend: string
  options: SelectOption<T>[]
  values: T[]
  onToggle: (value: T) => void
}

export function MultiOptionGroup<T extends string>({
  legend,
  options,
  values,
  onToggle,
}: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[--color-text]">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option.value)}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                selected
                  ? 'border-[--color-brand] bg-[--color-brand] text-white'
                  : 'border-[--color-border] bg-white text-[--color-text]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
