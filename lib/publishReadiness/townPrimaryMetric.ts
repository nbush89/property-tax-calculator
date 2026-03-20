/**
 * Priority-based primary town headline metric for publish checks (capabilities + real data).
 * Order: averageResidentialTaxBill → effectiveTaxRate → medianHomeValue.
 */

import type { TownData, CountyData } from '@/lib/data/types'
import type { TownOverview } from '@/lib/town-overview/types'
import type { MetricKey } from '@/lib/metrics/metricKeys'
import { getMetricLatest, getMetricSeries } from '@/lib/data/town-helpers'
import { isMetricDisplayAllowed } from '@/lib/metrics/stateMetricCapabilities'

const PRIMARY_ORDER = [
  'averageResidentialTaxBill',
  'effectiveTaxRate',
  'medianHomeValue',
] as const satisfies readonly MetricKey[]

export type TownPrimaryMetricResolution = {
  metricKey: MetricKey
  /** Latest value comes from a town-level series */
  townLevel: boolean
  /** Town series absent but county (or merged) series provides the headline value */
  countyFallbackForPrimary: boolean
}

function overviewValueForMetric(
  overview: TownOverview | null,
  key: MetricKey
): number | null | undefined {
  if (!overview) return undefined
  if (key === 'averageResidentialTaxBill') return overview.avgResidentialTaxBill
  if (key === 'effectiveTaxRate') return overview.effectiveTaxRatePct
  if (key === 'medianHomeValue') return overview.medianHomeValue
  return undefined
}

/**
 * First supported metric in priority order that has a usable headline value (series or overview).
 */
export function resolveTownPrimaryMetricForPublish(
  stateSlug: string,
  town: TownData,
  county: CountyData,
  overview: TownOverview | null
): TownPrimaryMetricResolution | null {
  for (const metricKey of PRIMARY_ORDER) {
    if (!isMetricDisplayAllowed(stateSlug, 'town', metricKey)) continue

    const townSeries = town.metrics?.[metricKey as keyof NonNullable<TownData['metrics']>]
    const townLevel = Boolean(
      townSeries && Array.isArray(townSeries) && townSeries.length > 0
    )

    const latest = getMetricLatest({
      town,
      county,
      metricKey: metricKey as 'averageResidentialTaxBill' | 'effectiveTaxRate' | 'medianHomeValue',
    })
    const ov = overviewValueForMetric(overview, metricKey)
    const hasValue =
      (latest != null && Number.isFinite(latest.value)) ||
      (ov != null && typeof ov === 'number' && Number.isFinite(ov))

    if (!hasValue) continue

    const countyFallbackForPrimary =
      !townLevel && getMetricSeries({ town, county, metricKey }) != null

    return {
      metricKey,
      townLevel,
      countyFallbackForPrimary,
    }
  }

  return null
}

/** Whether snapshot card can show honest figures (town or county-context). */
export function hasApprovedTownSnapshot(
  stateSlug: string,
  town: TownData,
  county: CountyData,
  overview: TownOverview | null
): boolean {
  return resolveTownPrimaryMetricForPublish(stateSlug, town, county, overview) != null
}
