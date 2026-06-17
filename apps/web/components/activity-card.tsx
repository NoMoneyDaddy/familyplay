import type { ScoredActivity } from '@familyplay/core'

interface Props {
  scored: ScoredActivity
  primary?: boolean
}

export function ActivityCard({ scored, primary = false }: Props) {
  const { activity, reasons } = scored

  return (
    <article
      className={`rounded-2xl border bg-white p-5 ${
        primary ? 'border-[--color-brand] shadow-sm' : 'border-[--color-border]'
      }`}
    >
      {reasons.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-[--color-bg] px-2 py-0.5 text-xs text-[--color-muted]"
            >
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <h3 className="mt-2 text-lg font-semibold text-[--color-text]">{activity.title}</h3>
      <p className="mt-1 text-xl font-bold text-[--color-brand]">{activity.openingLine}</p>

      <ol className="mt-3 space-y-1 text-sm text-[--color-text]">
        {activity.steps.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="text-[--color-muted]">{index + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs text-[--color-muted]">
        {activity.minDurationMinutes}–{activity.maxDurationMinutes} 分鐘
      </p>
    </article>
  )
}
