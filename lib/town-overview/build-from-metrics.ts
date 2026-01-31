/**
 * Build TownOverview from existing metrics (for ingestion/scripts).
 * Canonical field names only. Trend: trendPct/trendSeries when >= 3 years;
 * fiveYearTrendPct/trend5y only when >= 5 years.
 */

import type { TownOverview, TownOverviewSource } from './types'
import type { TownData, CountyData, StateData } from '@/lib/data/types'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { getLatestValue } from '@/lib/data/metrics'

const SOURCE_NAME = 'NJ Division of Taxation'
const SOURCE_URL = 'https://www.nj.gov/treasury/taxation/lpt/statdata.shtml'
const CENSUS_SOURCE_NAME = 'U.S. Census Bureau'
const CENSUS_SOURCE_URL = 'https://api.census.gov/data.html'

/**
 * Map state-level metrics to TownOverview fields.
 * State JSON uses averageTaxRate (effective rate); if state ever has
 * averageResidentialTaxBill we map that to stateAvgTaxBill.
 */
/** State metrics may include averageResidentialTaxBill in JSON before it's in StateMetrics type */
const stateMetricsWithBill = (s: StateData['metrics']) =>
  s as { averageResidentialTaxBill?: Parameters<typeof getLatestValue>[0] } | undefined

function getStateOverviewValues(state: StateData): {
  stateEffectiveTaxRatePct?: number
  stateAvgTaxBill?: number
} {
  const rate = getLatestValue(state.metrics?.averageTaxRate)
  const bill = getLatestValue(stateMetricsWithBill(state.metrics)?.averageResidentialTaxBill)
  return {
    stateEffectiveTaxRatePct: rate ?? undefined,
    stateAvgTaxBill: bill ?? undefined,
  }
}

/**
 * Compute percent change between first and last value in a series.
 */
function computeTrendPct(series: Array<{ year: number; value: number }>): number | null {
  if (series.length < 2) return null
  const sorted = [...series].sort((a, b) => a.year - b.year)
  const first = sorted[0].value
  const last = sorted[sorted.length - 1].value
  if (first === 0) return null
  return ((last - first) / first) * 100
}

/**
 * Build TownOverview from town + county + state metrics.
 * Use when populating overview from scraped data (e.g. in merge script).
 */
export function buildTownOverviewFromMetrics(
  town: TownData,
  county: CountyData,
  state: StateData,
  options?: { retrievedDate?: string }
): TownOverview {
  const asOfYear =
    town.asOfYear ?? county.asOfYear ?? state.state.asOfYear ?? new Date().getFullYear()

  const townBill = getMetricLatest({ town, county, metricKey: 'averageResidentialTaxBill' })
  const townRate = getMetricLatest({ town, county, metricKey: 'effectiveTaxRate' })
  const medianHome = getMetricLatest({ town, county, metricKey: 'medianHomeValue' })
  const countyBillLatest = getLatestValue(county.metrics?.averageResidentialTaxBill)
  const countyRateLatest = getLatestValue(county.metrics?.effectiveTaxRate)
  const stateValues = getStateOverviewValues(state)

  const seriesForTrend =
    (town.metrics?.averageResidentialTaxBill?.length ?? 0) >=
    (county.metrics?.averageResidentialTaxBill?.length ?? 0)
      ? (town.metrics?.averageResidentialTaxBill ?? [])
      : (county.metrics?.averageResidentialTaxBill ?? [])

  const normalized = seriesForTrend
    .map(d => ({ year: d.year, value: typeof d.value === 'number' ? d.value : 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => a.year - b.year)

  const hasTrend = normalized.length >= 3
  const startYear = normalized[0]?.year
  const endYear = normalized[normalized.length - 1]?.year
  const pctChange = hasTrend ? computeTrendPct(normalized) : null

  // 5-year: only when we have >= 5 years; compute over last 5 years
  const last5 = normalized.length >= 5 ? normalized.slice(-5) : null
  const fiveYearPct = last5 && last5.length >= 2 ? computeTrendPct(last5) : null

  const sources: TownOverviewSource[] = [
    {
      name: SOURCE_NAME,
      url: SOURCE_URL,
      retrieved: options?.retrievedDate ?? new Date().toISOString().slice(0, 10),
    },
  ]
  if (medianHome?.value != null) {
    sources.push({
      name: CENSUS_SOURCE_NAME,
      url: CENSUS_SOURCE_URL,
      retrieved: options?.retrievedDate ?? new Date().toISOString().slice(0, 10),
    })
  }

  const overview: TownOverview = {
    asOfYear,
    avgResidentialTaxBill: townBill?.value ?? undefined,
    effectiveTaxRatePct: townRate?.value ?? undefined,
    countyAvgTaxBill: countyBillLatest ?? undefined,
    countyEffectiveRatePct: countyRateLatest ?? undefined,
    stateAvgTaxBill: stateValues.stateAvgTaxBill,
    stateEffectiveTaxRatePct: stateValues.stateEffectiveTaxRatePct,
    sources,
  }
  if (medianHome?.value != null) {
    overview.medianHomeValue = medianHome.value
    overview.medianHomeValueYear = medianHome.year
  }

  if (hasTrend && pctChange != null && startYear != null && endYear != null) {
    overview.trendPct = pctChange
    overview.trendStartYear = startYear
    overview.trendEndYear = endYear
    overview.trendSeries = normalized

    if (normalized.length >= 5 && fiveYearPct != null) {
      overview.fiveYearTrendPct = fiveYearPct
      overview.trend5y = {
        startYear: normalized[normalized.length - 5].year,
        endYear,
        direction: fiveYearPct > 0 ? 'up' : fiveYearPct < 0 ? 'down' : 'flat',
        pctChange: fiveYearPct,
        series: normalized.slice(-5),
      }
    }
  }

  return overview
}
