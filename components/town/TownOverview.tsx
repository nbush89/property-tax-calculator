import Link from 'next/link'
import type { TownOverview as TownOverviewType } from '@/lib/town-overview/types'
import { validateTownOverview } from '@/lib/town-overview/validate'
import {
  formatUSD,
  formatPct,
  formatComparison,
  buildTownOverviewSummary,
} from '@/lib/town-overview/format'
import { Card } from '@/components/ui/Card'

export interface TownOverviewProps {
  townName: string
  countyName: string
  stateCode: string
  overview?: TownOverviewType | null
}

/**
 * Renders the standard Town Overview block when overview data exists.
 * Fails gracefully when overview is missing or invalid.
 */
export default function TownOverview({
  townName,
  countyName,
  stateCode,
  overview,
}: TownOverviewProps) {
  if (overview == null) {
    return (
      <div className="mb-8 rounded-lg border border-border bg-surface/50 px-4 py-3 text-sm text-text-muted">
        Data for this town is limited. Use the calculator below for estimates.
      </div>
    )
  }

  if (!validateTownOverview(overview)) {
    return null
  }

  const { asOfYear, provenance, notes } = overview
  const summary = buildTownOverviewSummary({ townName, countyName, overview })

  const bullets: { label: string; value: string }[] = []
  if (overview.avgResidentialTaxBill != null) {
    bullets.push({
      label: 'Avg residential tax bill',
      value: formatUSD(overview.avgResidentialTaxBill),
    })
  }
  if (overview.effectiveTaxRatePct != null) {
    bullets.push({
      label: 'Effective tax rate',
      value: formatPct(overview.effectiveTaxRatePct),
    })
  }
  if (overview.typicalHomeValue != null) {
    bullets.push({
      label: 'Typical home value',
      value: formatUSD(overview.typicalHomeValue),
    })
  }
  if (overview.comparisons?.vsCounty && overview.comparisons.vsCounty !== 'similar') {
    bullets.push({
      label: 'Vs county average',
      value: `${formatComparison(overview.comparisons.vsCounty)} county average`,
    })
  }
  if (overview.comparisons?.vsState && overview.comparisons.vsState !== 'similar') {
    bullets.push({
      label: 'Vs state average',
      value: `${formatComparison(overview.comparisons.vsState)} state average`,
    })
  }
  if (overview.trend5y?.direction && overview.trend5y.pctChange != null) {
    const dir =
      overview.trend5y.direction === 'up'
        ? 'Up'
        : overview.trend5y.direction === 'down'
          ? 'Down'
          : 'Flat'
    bullets.push({
      label: '5-year trend',
      value: `${dir} ~${Math.abs(overview.trend5y.pctChange).toFixed(1)}% (${overview.trend5y.startYear}–${overview.trend5y.endYear})`,
    })
  }

  const sourceName = provenance?.sourceName
  const methodologyUrl = provenance?.methodologyUrl ?? '/methodology'

  return (
    <Card className="mb-8 p-6">
      <h2 className="text-xl font-semibold text-text mb-4">
        {townName} Property Tax Overview ({asOfYear})
      </h2>

      {bullets.length > 0 && (
        <ul className="list-disc list-inside space-y-1.5 text-text-muted mb-4">
          {bullets.map((b, i) => (
            <li key={i}>
              <span className="text-text">{b.label}:</span> {b.value}
            </li>
          ))}
        </ul>
      )}

      <p className="text-text-muted text-sm leading-relaxed mb-4">{summary}</p>

      {(sourceName || asOfYear) && (
        <p className="text-xs text-text-muted border-t border-border pt-4">
          Data as of {asOfYear}
          {sourceName && (
            <>
              {' • '}
              Source: {sourceName}
              {methodologyUrl && (
                <>
                  {' '}
                  <Link
                    href={methodologyUrl}
                    className="text-primary hover:text-primary-hover underline"
                  >
                    Methodology
                  </Link>
                </>
              )}
            </>
          )}
        </p>
      )}

      {notes && notes.length > 0 && (
        <div className="mt-3 text-xs text-text-muted space-y-1">
          {notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>
      )}
    </Card>
  )
}
