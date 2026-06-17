'use client'

import type { SelectOption } from '@/lib/options'

interface Props<T extends string | number> {
  legend: string
  options: SelectOption<T>[]
  value: T | null
  onChange: (value: T) => void
}

export function OptionGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[--color-text]">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? 'border-[--color-brand] bg-[--color-brand] text-white'
                  : 'border-[--color-border] bg-white text-[--color-text]'
              }`}
            >
              <span className="font-medium">{option.label}</span>
              {option.hint ? <span className="block text-xs opacity-80">{option.hint}</span> : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
