/**
 * Derive TownOverview fields (e.g. vsCounty/vsState) from numeric comparisons when not set.
 * Enrich year fields from raw metrics when overview was stored without them (e.g. pre–year-field JSON).
 */

import type { TownOverview, VsComparison } from './types'
import type { TownData, CountyData } from '@/lib/data/types'
import { getMetricLatest } from '@/lib/data/town-helpers'

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
 * Fill overview year fields from town/county metrics when missing.
 * Use when the stored overview (e.g. from JSON) was built before effectiveTaxRateYear etc. existed,
 * so the UI shows the correct year for each metric (e.g. 2025 for rate, 2024 for Census).
 */
export function enrichOverviewYearsFromMetrics(
  town: TownData,
  county: CountyData,
  overview: TownOverview
): TownOverview {
  const result = { ...overview }
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
