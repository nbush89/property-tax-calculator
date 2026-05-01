/**
 * Server-side helper: extracts lightweight county metrics for the stepped
 * calculator's live-preview sidebar. Runs at request time so no client
 * bundle impact; results are passed down as a plain serialisable prop.
 */

import { getStateData, getAvailableStates } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import { getLatestValue } from '@/lib/data/metrics'

export interface CountyPreview {
  /** Effective tax rate in percent form, e.g. 2.35 = 2.35% */
  effectiveRatePct: number | null
  /** Average / median annual bill in dollars */
  avgBill: number | null
}

export interface StatePreview {
  /** State-level average effective rate in percent form */
  avgRatePct: number | null
  /** State-level average bill if available */
  avgBill: number | null
  /** Per-county previews keyed by county slug */
  counties: Record<string, CountyPreview>
}

/** Top-level map: stateSlug → StatePreview */
export type PreviewMetricsMap = Record<string, StatePreview>

/**
 * Build preview metrics for all available states.
 * Only reads data already loaded in the registry — no I/O.
 */
export function buildPreviewMetricsMap(): PreviewMetricsMap {
  const result: PreviewMetricsMap = {}

  for (const { slug: stateSlug } of getAvailableStates()) {
    const stateData = getStateData(stateSlug)
    if (!stateData) continue

    // State-level aggregates
    const avgRatePct = getLatestValue(stateData.metrics?.averageTaxRate) ?? null

    // Rough state avg bill: median across county avg bills
    const allBills: number[] = []
    for (const c of stateData.counties) {
      const bill = getLatestValue(c.metrics?.averageResidentialTaxBill)
      if (bill != null) allBills.push(bill)
    }
    const stateAvgBill =
      allBills.length > 0
        ? Math.round(allBills.reduce((s, v) => s + v, 0) / allBills.length)
        : null

    const counties: Record<string, CountyPreview> = {}
    for (const c of stateData.counties) {
      const countySlug = c.slug || slugifyLocation(c.name)

      // Effective rate: series values are already in percent form (e.g. 2.35 = 2.35%)
      const rateSeries = c.metrics?.effectiveTaxRate ?? []
      const effectiveRatePct =
        rateSeries.length > 0
          ? rateSeries[rateSeries.length - 1].value
          : null

      // Average bill
      const billSeries = c.metrics?.averageResidentialTaxBill ?? []
      const avgBill =
        billSeries.length > 0
          ? billSeries[billSeries.length - 1].value
          : null

      counties[countySlug] = { effectiveRatePct, avgBill }
    }

    result[stateSlug] = { avgRatePct, avgBill: stateAvgBill, counties }
  }

  return result
}
