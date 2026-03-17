/**
 * Derive TownOverview fields (e.g. vsCounty/vsState) from numeric comparisons when not set.
 * Enrich year fields and county/state context from raw metrics when overview was stored without them.
 */

import type { TownOverview, VsComparison } from './types'
import type { TownData, CountyData, StateData } from '@/lib/data/types'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { getLatestValue } from '@/lib/data/metrics'

const SIMILAR_THRESHOLD_PCT = 5 // within 5% = "similar" / "about_the_same"

function compareToBaseline(value: number, baseline: number): VsComparison {
  if (baseline === 0) return 'similar'
  const pct = ((value - baseline) / baseline) * 100
  if (Math.abs(pct) <= SIMILAR_THRESHOLD_PCT) return 'about_the_same'
  return pct > 0 ? 'higher' : 'lower'
}

/**
 * Derive vsCounty and vsState from numeric fields if not already set.
 * Mutates overview in place; returns the same object.
 */
export function deriveTownOverviewComparisons(overview: TownOverview): TownOverview {
  const townBill = overview.avgResidentialTaxBill
  const townRate = overview.effectiveTaxRatePct
  const countyBill = overview.countyAvgTaxBill
  const countyRate = overview.countyEffectiveRatePct
  const stateBill = overview.stateAvgTaxBill
  const stateRate = overview.stateEffectiveTaxRatePct

  if (!overview.comparisons) {
    overview.comparisons = {}
  }

  if (overview.comparisons.vsCounty === undefined) {
    if (townRate != null && countyRate != null) {
      overview.comparisons.vsCounty = compareToBaseline(townRate, countyRate)
    } else if (townBill != null && countyBill != null) {
      overview.comparisons.vsCounty = compareToBaseline(townBill, countyBill)
    }
  }

  if (overview.comparisons.vsState === undefined) {
    if (townRate != null && stateRate != null) {
      overview.comparisons.vsState = compareToBaseline(townRate, stateRate)
    } else if (townBill != null && stateBill != null) {
      overview.comparisons.vsState = compareToBaseline(townBill, stateBill)
    }
  }

  // Top-level aliases for UI convenience
  if (overview.vsCounty === undefined && overview.comparisons.vsCounty !== undefined) {
    overview.vsCounty = overview.comparisons.vsCounty
  }
  if (overview.vsState === undefined && overview.comparisons.vsState !== undefined) {
    overview.vsState = overview.comparisons.vsState
  }

  return overview
}

/**
 * Fill overview year fields and county/state context from metrics when missing.
 * County and state rates are stored once at county/state level; we fill them here so the UI
 * does not need to duplicate them in every town's overview.
 */
export function enrichOverviewYearsFromMetrics(
  town: TownData,
  county: CountyData,
  overview: TownOverview,
  stateData?: StateData
): TownOverview {
  const result = { ...overview }

  // County-level context: always prefer county.metrics when available (single source of truth).
  // This keeps the town page "county average" in sync with the calculator's county rate.
  const countyBill = getLatestValue(county.metrics?.averageResidentialTaxBill)
  if (countyBill != null) result.countyAvgTaxBill = countyBill
  const countyRate = getLatestValue(county.metrics?.effectiveTaxRate)
  if (countyRate != null) result.countyEffectiveRatePct = countyRate

  // When the town has no town-level series, use county metrics so "county average" display matches the calculator.
  const hasTownEffectiveRate = Boolean(town?.metrics?.effectiveTaxRate?.length)
  const hasTownAvgBill = Boolean(town?.metrics?.averageResidentialTaxBill?.length)
  if (!hasTownEffectiveRate && countyRate != null) {
    result.effectiveTaxRatePct = countyRate
    const countyRateYear = county.metrics?.effectiveTaxRate?.length
      ? county.metrics.effectiveTaxRate[county.metrics.effectiveTaxRate.length - 1].year
      : undefined
    if (countyRateYear != null) result.effectiveTaxRateYear = countyRateYear
  }
  if (!hasTownAvgBill && countyBill != null) {
    result.avgResidentialTaxBill = countyBill
    const countyBillYear = county.metrics?.averageResidentialTaxBill?.length
      ? county.metrics.averageResidentialTaxBill[county.metrics.averageResidentialTaxBill.length - 1].year
      : undefined
    if (countyBillYear != null) result.avgResidentialTaxBillYear = countyBillYear
  }

  // Fill state-level context from state.metrics when not on overview
  if (stateData) {
    if (result.stateAvgTaxBill == null) {
      const stateMetrics = stateData.metrics as { averageResidentialTaxBill?: Parameters<typeof getLatestValue>[0] } | undefined
      const v = getLatestValue(stateMetrics?.averageResidentialTaxBill)
      if (v != null) result.stateAvgTaxBill = v
    }
    if (result.stateEffectiveTaxRatePct == null) {
      const v = getLatestValue(stateData.metrics?.averageTaxRate)
      if (v != null) result.stateEffectiveTaxRatePct = v
    }
  }

  if (result.effectiveTaxRateYear == null) {
    const latest = getMetricLatest({ town, county, metricKey: 'effectiveTaxRate' })
    if (latest?.year != null) result.effectiveTaxRateYear = latest.year
  }
  if (result.avgResidentialTaxBillYear == null) {
    const latest = getMetricLatest({ town, county, metricKey: 'averageResidentialTaxBill' })
    if (latest?.year != null) result.avgResidentialTaxBillYear = latest.year
  }
  if (result.medianHomeValueYear == null) {
    const latest = getMetricLatest({ town, county, metricKey: 'medianHomeValue' })
    if (latest?.year != null) result.medianHomeValueYear = latest.year
  }
  return result
}
