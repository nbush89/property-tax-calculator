import Link from 'next/link'
import { getTopCountiesForHero } from '@/lib/geo'
import { buildCountyTownsIndexHref } from '@/lib/links/towns'

/**
 * Inline SVG sparkline. Uses a neutral blue — direction is shown by shape,
 * not color, since "up" vs "down" means different things for bills vs rates.
 */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <span className="text-text-muted text-xs">—</span>
  }
  const w = 56
  const h = 22
  const pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.01
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2)
      const y = h - pad - ((v - min) / range) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="inline-block"
    >
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  )
}

type Props = {
  stateSlug: string
  stateName: string
  /** Number of counties to show. Defaults to all counties in the state. */
  limit?: number
}

/**
 * Table of top counties by average residential tax bill, with inline sparklines.
 * Intended for state-level pages as an above-the-fold data anchor.
 *
 * This is a server component — data is fetched at build time via getTopCountiesForHero.
 */
export default function TopCountiesTable({ stateSlug, stateName, limit = 100 }: Props) {
  const counties = getTopCountiesForHero(stateSlug, limit)
  if (counties.length === 0) return null

  const hasAvgBill = counties.some(c => c.avgBill != null)
  const hasTrend = counties.some(c => c.trend.length >= 2)
  // Label the trend column based on what data is available
  const trendLabel = counties.some(c => c.trendType === 'bill') ? 'Bill Trend' : 'Rate Trend'
  const trendNote = counties.some(c => c.trendType === 'bill')
    ? 'Avg residential tax bill trend'
    : 'Effective rate trend (bill data unavailable)'

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-text">
            {stateName} counties — tax rates at a glance
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Sorted by average residential tax bill, highest first.{' '}
            {hasTrend && trendNote + ', up to 5 years.'}
          </p>
        </div>
        <Link
          href={`/${stateSlug}/property-tax-rates`}
          className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap"
        >
          Full rates table →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className="px-4 py-3 font-medium text-text-muted">County</th>
              {hasAvgBill && (
                <th className="px-4 py-3 text-right font-medium text-text-muted">Avg Bill</th>
              )}
              <th className="px-4 py-3 text-right font-medium text-text-muted">Eff. Rate</th>
              {hasTrend && (
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  {trendLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {counties.map((c, i) => (
              <tr
                key={c.slug}
                className={`border-b border-border last:border-0 transition-colors hover:bg-primary/5 ${
                  i % 2 === 0 ? 'bg-bg' : 'bg-surface/30'
                }`}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/${stateSlug}/${c.slug}-county-property-tax`}
                    className="font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    {c.name} County
                  </Link>
                  {c.publishedTownCount > 0 && (
                    <div className="mt-0.5">
                      <Link
                        href={buildCountyTownsIndexHref(stateSlug, `${c.slug}-county-property-tax`)}
                        className="text-xs text-text-muted hover:text-primary transition-colors"
                      >
                        {c.publishedTownCount} town{c.publishedTownCount !== 1 ? 's' : ''} →
                      </Link>
                    </div>
                  )}
                </td>
                {hasAvgBill && (
                  <td className="px-4 py-3 text-right tabular-nums text-text">
                    {c.avgBill != null
                      ? `$${Math.round(c.avgBill).toLocaleString('en-US')}`
                      : <span className="text-text-muted">—</span>}
                  </td>
                )}
                <td className="px-4 py-3 text-right tabular-nums text-text">
                  {c.effectiveRatePct != null
                    ? `${c.effectiveRatePct.toFixed(2)}%`
                    : <span className="text-text-muted">—</span>}
                </td>
                {hasTrend && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center">
                      <Sparkline values={c.trend} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-text-muted">
        Planning estimates only — individual bills depend on local assessments and exemptions.
      </p>
    </div>
  )
}
