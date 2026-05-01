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
    <section aria-labelledby="county-overview-heading" className="max-w-none mb-10">
      <h2 id="county-overview-heading" className="text-2xl font-semibold text-text mb-4">
        {overview.title ?? 'Overview'}
      </h2>
      <div className="prose prose-lg max-w-none text-text-muted space-y-3">
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
      <h2 id="county-compare-heading" className="text-2xl font-semibold text-text mb-4">
        {comparison.title}
      </h2>
      {comparison.summary && (
        <p className="text-sm text-text-muted mb-4 w-full">{comparison.summary}</p>
      )}
      <ul className="space-y-3">
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
      <h2 id="county-factors-heading" className="text-2xl font-semibold text-text mb-4">
        {taxFactors.title}
      </h2>
      {taxFactors.intro && (
        <p className="text-text-muted mb-3 w-full">{taxFactors.intro}</p>
      )}
      <ul className="list-disc pl-5 space-y-2 text-text-muted w-full max-w-none">
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
  return (
    <section aria-labelledby="county-related-heading" className="mb-10">
      <h2 id="county-related-heading" className="text-2xl font-semibold text-text mb-4">
        {relatedCounties.title}
      </h2>
      {relatedCounties.intro && (
        <p className="text-text-muted mb-4 w-full">{relatedCounties.intro}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {relatedCounties.counties.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-lg border border-border bg-surface p-4 hover:border-primary hover:bg-bg transition-colors"
          >
            <span className="font-medium text-text">{c.name} County</span>
            {c.summary && (
              <span className="block text-sm text-text-muted mt-1">{c.summary}</span>
            )}
            <span className="block text-xs text-primary mt-2">View county →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
