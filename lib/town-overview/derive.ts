/**
 * Derive TownOverview fields (e.g. vsCounty/vsState) from numeric comparisons when not set.
 */

import type { TownOverview, VsComparison } from './types'

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
