import Link from 'next/link'
import type { CountyPageContent } from '@/lib/content/countyContent'

function toneBorder(t?: 'neutral' | 'positive' | 'warning'): string {
  if (t === 'positive') return 'border-l-4 border-l-emerald-500/80'
  if (t === 'warning') return 'border-l-4 border-l-amber-500/80'
  return 'border-l-4 border-l-border'
}

export function CountyOverviewSection({
  overview,
}: {
  overview: CountyPageContent['overview']
}) {
  return (
    <section aria-labelledby="county-overview-heading" className="mb-10">
      <h2 id="county-overview-heading" className="text-2xl font-semibold text-text mb-4">
        {overview.title ?? 'Overview'}
      </h2>
      <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
        {overview.paragraphs.map((p, i) => (
          <p key={i} className={i === 0 ? 'text-lg text-text' : ''}>
            {p}
          </p>
        ))}
      </div>
    </section>
  )
}

export function CountyComparisonSection({
  comparison,
}: {
  comparison: NonNullable<CountyPageContent['comparison']>
}) {
  if (comparison.items.length === 0) return null
  return (
    <section aria-labelledby="county-compare-heading" className="mb-10">
      <h3 id="county-compare-heading" className="text-lg font-semibold text-text mt-2 mb-1">
        {comparison.title}
      </h3>
      {comparison.summary && (
        <p className="text-sm text-text-muted mb-4 measure">{comparison.summary}</p>
      )}
      <ul className="grid sm:grid-cols-2 gap-3">
        {comparison.items.map((item, i) => (
          <li
            key={i}
            className={`rounded-lg border border-border bg-surface p-4 pl-5 shadow-sm ${toneBorder(item.tone)}`}
          >
            <p className="text-sm font-medium text-text">{item.label}</p>
            <p className="mt-1 text-sm text-text-muted leading-relaxed">{item.value}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CountyTaxFactorsSection({
  taxFactors,
}: {
  taxFactors: CountyPageContent['taxFactors']
}) {
  return (
    <section aria-labelledby="county-factors-heading" className="mb-10">
      <h3 id="county-factors-heading" className="text-lg font-semibold text-text mb-3">
        {taxFactors.title}
      </h3>
      {taxFactors.intro && (
        <p className="text-text-muted mb-3 measure">{taxFactors.intro}</p>
      )}
      <ul className="list-disc pl-5 space-y-2 text-text-muted measure">
        {taxFactors.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </section>
  )
}

export function CountyEstimateGuideSection({
  estimateGuide,
}: {
  estimateGuide: CountyPageContent['estimateGuide']
}) {
  return (
    <section aria-labelledby="county-estimate-guide-heading" className="mb-10">
      <h2 id="county-estimate-guide-heading" className="text-2xl font-semibold text-text mb-4">
        {estimateGuide.title}
      </h2>
      <ol className="list-decimal pl-5 space-y-2 text-text-muted w-full max-w-none">
        {estimateGuide.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {estimateGuide.note && (
        <p className="mt-4 text-sm text-text-muted w-full border-t border-border pt-4">
          {estimateGuide.note}{' '}
          <Link href="/methodology" className="data-link">
            Methodology
          </Link>
          .
        </p>
      )}
    </section>
  )
}

export function CountyRelatedCountiesSection({
  relatedCounties,
}: {
  relatedCounties: NonNullable<CountyPageContent['relatedCounties']>
}) {
  if (relatedCounties.counties.length === 0) return null
  const currentRate = relatedCounties.currentCountyRatePct
  const currentName = relatedCounties.currentCountyName

  return (
    <section aria-labelledby="county-related-heading" className="mb-10">
      <h2 id="county-related-heading" className="text-2xl font-semibold text-text mb-4">
        {relatedCounties.title}
      </h2>
      {relatedCounties.intro && (
        <p className="text-text-muted mb-4 measure">{relatedCounties.intro}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {relatedCounties.counties.map(c => {
          // Compare effective rate to current county (when both present).
          // Green = lower than current (cheaper). Amber = higher (more expensive).
          // Tolerance of 0.01 percentage points avoids classifying near-ties as movement.
          let direction: 'lower' | 'higher' | 'similar' | null = null
          if (
            c.effectiveRatePct != null &&
            currentRate != null &&
            currentName != null
          ) {
            const delta = c.effectiveRatePct - currentRate
            if (delta < -0.01) direction = 'lower'
            else if (delta > 0.01) direction = 'higher'
            else direction = 'similar'
          }
          const rateColor =
            direction === 'lower'
              ? 'text-emerald-700 bg-emerald-50 ring-emerald-200'
              : direction === 'higher'
                ? 'text-amber-800 bg-amber-50 ring-amber-200'
                : 'text-text bg-bg ring-border'
          const directionLabel =
            direction === 'lower'
              ? `Lower rate than ${currentName}`
              : direction === 'higher'
                ? `Higher rate than ${currentName}`
                : direction === 'similar'
                  ? `Similar rate to ${currentName}`
                  : null

          return (
            <Link
              key={c.href}
              href={c.href}
              className="block rounded-lg border border-border bg-surface p-4 hover:border-primary hover:bg-bg transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-text">{c.name} County</span>
                {c.effectiveRatePct != null && (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ${rateColor}`}
                  >
                    {c.effectiveRatePct.toFixed(2)}%
                  </span>
                )}
              </div>
              {directionLabel && (
                <span className="block text-xs text-text-muted mt-1.5">{directionLabel}</span>
              )}
              <span className="block text-xs text-primary mt-2">View county →</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
