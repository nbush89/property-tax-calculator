/**
 * Detect unsupported metrics present on overview payloads and sourceRef gaps.
 */

import type { TownData, CountyData } from '@/lib/data/types'
import type { TownOverview } from '@/lib/town-overview/types'
import type { MetricKey } from '@/lib/metrics/metricKeys'
import { isMetricDisplayAllowed } from '@/lib/metrics/stateMetricCapabilities'
import { getMetricLatest } from '@/lib/data/town-helpers'

const TOWN_METRICS: MetricKey[] = ['averageResidentialTaxBill', 'effectiveTaxRate', 'medianHomeValue']

export function findUnsupportedTownMetricsOnOverview(
  stateSlug: string,
  overview: TownOverview | null
): MetricKey[] {
  if (!overview) return []
  const bad: MetricKey[] = []
  // Flag as unsupported only when neither the NJ-style avg bill nor the TX-style
  // median taxes paid is allowed for this state. If medianTaxesPaid is supported,
  // the overview's avgResidentialTaxBill field is legitimately populated from that source.
  if (
    overview.avgResidentialTaxBill != null &&
    !isMetricDisplayAllowed(stateSlug, 'town', 'averageResidentialTaxBill') &&
    !isMetricDisplayAllowed(stateSlug, 'town', 'medianTaxesPaid')
  ) {
    bad.push('averageResidentialTaxBill')
  }
  if (
    overview.effectiveTaxRatePct != null &&
    !isMetricDisplayAllowed(stateSlug, 'town', 'effectiveTaxRate')
  ) {
    bad.push('effectiveTaxRate')
  }
  if (
    overview.medianHomeValue != null &&
    !isMetricDisplayAllowed(stateSlug, 'town', 'medianHomeValue')
  ) {
    bad.push('medianHomeValue')
  }
  return bad
}

export function primaryMetricHasSourceRef(params: {
  stateSlug: string
  town: TownData
  county: CountyData
  primaryKey: MetricKey | undefined
}): boolean {
  const { town, county, primaryKey } = params
  if (!primaryKey) return false
  if (
    primaryKey !== 'averageResidentialTaxBill' &&
    primaryKey !== 'effectiveTaxRate' &&
    primaryKey !== 'medianHomeValue'
  ) {
    return false
  }
  const latest = getMetricLatest({
    town,
    county,
    metricKey: primaryKey,
  })
  if (latest?.sourceRef && String(latest.sourceRef).length > 0) return true

  const townSeries = town.metrics?.[primaryKey]
  const lastTown = townSeries?.[townSeries.length - 1]
  if (lastTown?.sourceRef) return true

  if (primaryKey === 'averageResidentialTaxBill') {
    const s = county.metrics?.averageResidentialTaxBill
    const last = s?.[s.length - 1]
    if (last?.sourceRef) return true
  }
  if (primaryKey === 'effectiveTaxRate') {
    const s = county.metrics?.effectiveTaxRate
    const last = s?.[s.length - 1]
    if (last?.sourceRef) return true
  }

  return false
}
