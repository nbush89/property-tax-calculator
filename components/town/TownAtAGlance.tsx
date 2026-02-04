import Link from 'next/link'
import type { TownOverview as TownOverviewType } from '@/lib/town-overview/types'
import { validateTownOverview } from '@/lib/town-overview/validate'
import { deriveTownOverviewComparisons } from '@/lib/town-overview/derive'
import {
  formatUSD,
  formatPct,
  comparisonShort,
  buildTownOverviewSummary,
  type ComparisonLabel,
} from '@/lib/town-overview/format'
import { Card } from '@/components/ui/Card'

export interface TownAtAGlanceProps {
  townName: string
  countyName: string
  stateCode: string
  overview?: TownOverviewType | null
}

/**
 * Single "Town at a glance" card: 4–6 bullets + 1 data-driven paragraph + sources.
 * This is the only summary card on the town page.
 */
export default function TownAtAGlance({
  townName,
  countyName,
  stateCode,
  overview,
}: TownAtAGlanceProps) {
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

  const o = deriveTownOverviewComparisons({ ...overview })
  const asOfYear = o.asOfYear
  const summary = buildTownOverviewSummary({ townName, countyName, overview: o })

  const vsCounty = o.vsCounty ?? o.comparisons?.vsCounty
  const vsState = o.vsState ?? o.comparisons?.vsState
  const trendPct = o.trendPct ?? o.fiveYearTrendPct ?? o.trend5y?.pctChange
  const trendStart = o.trendStartYear ?? o.trend5y?.startYear
  const trendEnd = o.trendEndYear ?? o.trend5y?.endYear
  const billIsCountyFallback =
    o.avgResidentialTaxBill != null &&
    o.countyAvgTaxBill != null &&
    o.avgResidentialTaxBill === o.countyAvgTaxBill
  const rateIsCountyFallback =
    o.effectiveTaxRatePct != null &&
    o.countyEffectiveRatePct != null &&
    o.effectiveTaxRatePct === o.countyEffectiveRatePct
  const showCountyFallbackNote = billIsCountyFallback || rateIsCountyFallback

  const billYear =
    o.avgResidentialTaxBillYear ?? o.asOfYear
  const rateYear =
    o.effectiveTaxRateYear ?? o.asOfYear
  const medianYear = o.medianHomeValueYear ?? o.asOfYear
  const trendRange =
    trendStart != null && trendEnd != null && trendStart !== trendEnd
      ? ` (${trendStart}–${trendEnd})`
      : trendEnd != null
        ? ` (${trendEnd})`
        : ''

  const bullets: { label: string; value: string; yearLabel?: string }[] = []
  if (o.avgResidentialTaxBill != null) {
    const label = billIsCountyFallback
      ? 'Avg residential tax bill (county average)'
      : 'Avg residential tax bill'
    bullets.push({
      label,
      value: formatUSD(o.avgResidentialTaxBill),
      yearLabel: ` (${billYear})`,
    })
  }
  if (o.effectiveTaxRatePct != null) {
    const label = rateIsCountyFallback
      ? 'Effective tax rate (county average)'
      : 'Effective tax rate'
    bullets.push({
      label,
      value: formatPct(o.effectiveTaxRatePct),
      yearLabel: ` (${rateYear})`,
    })
  }
  if (o.medianHomeValue != null) {
    bullets.push({
      label: 'Median home value',
      value: formatUSD(o.medianHomeValue),
      yearLabel: ` (${medianYear})`,
    })
  } else if (o.typicalHomeValue != null) {
    bullets.push({ label: 'Typical home value', value: formatUSD(o.typicalHomeValue) })
  }
  if (vsCounty && (vsCounty === 'higher' || vsCounty === 'lower')) {
    bullets.push({
      label: 'Compared to county',
      value: comparisonShort(vsCounty as ComparisonLabel),
    })
  }
  if (vsState && (vsState === 'higher' || vsState === 'lower')) {
    bullets.push({
      label: 'Compared to state',
      value: comparisonShort(vsState as ComparisonLabel),
    })
  }
  if (trendPct != null && trendStart != null && trendEnd != null) {
    const arrow = trendPct > 0 ? '↑' : trendPct < 0 ? '↓' : '→'
    const value =
      trendPct === 0 || (trendPct > -0.1 && trendPct < 0.1)
        ? '→ Flat'
        : `${arrow} ${Math.abs(trendPct).toFixed(1)}%`
    bullets.push({
      label: 'Recent trend',
      value,
      yearLabel: trendRange,
    })
  }

  const sources =
    o.sources && o.sources.length > 0
      ? o.sources
      : o.provenance?.sourceName
        ? [
            {
              name: o.provenance.sourceName,
              url: o.provenance.sourceUrl,
              retrieved: o.provenance.lastUpdated,
            },
          ]
        : []
  const methodologyUrl = o.provenance?.methodologyUrl ?? '/methodology'

  const taxYearForFooter = o.effectiveTaxRateYear ?? o.asOfYear

  return (
    <Card className="mb-8 p-6">
      <h2 className="text-xl font-semibold text-text mb-4">
        Town at a glance — latest available data by source
      </h2>

      {showCountyFallbackNote && (
        <p className="text-sm text-text-muted mb-3 italic">
          Town-level data is not in our dataset for this municipality; figures below are{' '}
          {countyName} County averages where shown.
        </p>
      )}

      {bullets.length > 0 && (
        <ul className="list-disc list-inside space-y-1.5 text-text-muted mb-4">
          {bullets.map((b, i) => (
            <li key={i}>
              <span className="text-text">{b.label}:</span> {b.value}
              {b.yearLabel != null && (
                <span className="text-text-muted">{b.yearLabel}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-text-muted text-sm leading-relaxed mb-4">{summary}</p>

      {(sources.length > 0 || taxYearForFooter != null) && (
        <p className="text-xs text-text-muted border-t border-border pt-4">
          Data as of latest available year by source
          {taxYearForFooter != null && (
            <> — Tax rates updated through {taxYearForFooter} where available</>
          )}
          {sources.length > 0 && (
            <>
              {' • '}
              Source{sources.length > 1 ? 's' : ''}:{' '}
              {sources.map((s, i) => (
                <span key={i}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-hover underline"
                    >
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                  {s.retrieved && ` (retrieved ${s.retrieved})`}
                  {i < sources.length - 1 ? '; ' : ''}
                </span>
              ))}{' '}
              <Link
                href={methodologyUrl}
                className="text-primary hover:text-primary-hover underline"
              >
                Methodology
              </Link>
            </>
          )}
        </p>
      )}

      {o.notes && o.notes.length > 0 && (
        <div className="mt-3 text-xs text-text-muted space-y-1">
          {o.notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>
      )}
    </Card>
  )
}
