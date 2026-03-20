/**
 * Display resolver: combines metric catalog, state capabilities, and entity metric payloads.
 */

import type { TownData, CountyData, MetricSeries, DataPoint } from '@/lib/data/types'
import { getMetricSeries } from '@/lib/data/town-helpers'
import type { GeographyLevel, MetricAvailability } from './capabilityTypes'
import { getMetricAvailability, getStateMetricsConfig } from './stateMetricCapabilities'
import { METRIC_CATALOG, getMetricKeysByPriority } from './metricCatalog'
import type { MetricKey } from './metricKeys'

const TOWN_PAYLOAD_KEYS = [
  'averageResidentialTaxBill',
  'effectiveTaxRate',
  'medianHomeValue',
] as const satisfies readonly MetricKey[]

export type DisplayPageContext = 'detail' | 'comparison'

export type ResolvedDisplayMetric = {
  key: MetricKey
  catalog: (typeof METRIC_CATALOG)[MetricKey]
  availability: MetricAvailability
  valuePresent: boolean
  /** Latest datapoint when series is usable */
  latestPoint: DataPoint | null
  /** Full series when present */
  metricData: MetricSeries | undefined
  show: boolean
  showAsUnavailable?: boolean
  sourceRef?: string
  note?: string
  semantics?: MetricAvailability['semantics']
  comparability?: MetricAvailability['comparability']
}

/** Build town (+ county fallback) metric payload for the display resolver. */
export function buildTownMetricPayload(
  town: TownData,
  county: CountyData
): Partial<Record<MetricKey, MetricSeries>> {
  const out: Partial<Record<MetricKey, MetricSeries>> = {}
  for (const key of TOWN_PAYLOAD_KEYS) {
    const s = getMetricSeries({ town, county, metricKey: key })
    if (s && s.length > 0) {
      out[key] = s
    }
  }
  return out
}

export function hasUsableMetricValue(metricData: MetricSeries | undefined): boolean {
  if (!metricData || metricData.length === 0) return false
  const last = metricData[metricData.length - 1]
  return last != null && Number.isFinite(last.value)
}

/**
 * Whether two states can be compared on this metric in a naive UI (e.g. side-by-side).
 */
export function canCompareMetricAcrossStates(
  metricKey: MetricKey,
  stateSlugA: string,
  stateSlugB: string
): boolean {
  const catalog = METRIC_CATALOG[metricKey]
  if (!catalog.defaultComparable) return false
  const a = getMetricAvailability(stateSlugA, 'county', metricKey)
  const b = getMetricAvailability(stateSlugB, 'county', metricKey)
  if (!a?.supported || !b?.supported) return false
  const low = (x: typeof a) =>
    x?.comparability === 'low' || x?.semantics === 'state_specific'
  if (low(a) || low(b)) return false
  return true
}

export function resolveDisplayMetrics(params: {
  stateSlug: string
  geographyLevel: GeographyLevel
  metrics: Partial<Record<MetricKey, MetricSeries | undefined>> | undefined
  context?: DisplayPageContext
  /** Include supported metrics with no usable data (showAsUnavailable) */
  includeMissing?: boolean
}): ResolvedDisplayMetric[] {
  const { stateSlug, geographyLevel, metrics, includeMissing } = params
  const cfg = getStateMetricsConfig(stateSlug)
  const out: ResolvedDisplayMetric[] = []
  const ordered = getMetricKeysByPriority()

  const defaultAvailability: MetricAvailability = {
    supported: true,
    semantics: 'standard',
    comparability: 'medium',
  }

  for (const key of ordered) {
    const catalog = METRIC_CATALOG[key]
    const availabilityRow = getMetricAvailability(stateSlug, geographyLevel, key)

    if (cfg) {
      if (!availabilityRow || availabilityRow.supported !== true) {
        continue
      }
    } else if (availabilityRow?.supported === false) {
      continue
    }

    const availability: MetricAvailability =
      availabilityRow && availabilityRow.supported === true
        ? availabilityRow
        : defaultAvailability

    const series = metrics?.[key]
    const valuePresent = hasUsableMetricValue(series)
    const latestPoint = valuePresent && series ? series[series.length - 1] : null

    const show = valuePresent
    const showAsUnavailable = !valuePresent && includeMissing === true

    if (!show && !showAsUnavailable) {
      continue
    }

    out.push({
      key,
      catalog,
      availability,
      valuePresent,
      latestPoint,
      metricData: series,
      show,
      showAsUnavailable,
      sourceRef: availability.sourceRef,
      note: availability.note,
      semantics: availability.semantics,
      comparability: availability.comparability,
    })
  }

  return out
}

export function formatResolvedMetricValue(metric: ResolvedDisplayMetric): string {
  const p = metric.latestPoint
  if (!p) return '—'
  const { format } = metric.catalog
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(p.value)
  }
  if (format === 'percent') {
    return `${p.value.toFixed(2)}%`
  }
  return String(p.value)
}

/** Tax / data year for latest point */
export function formatResolvedMetricYear(metric: ResolvedDisplayMetric): number | null {
  return metric.latestPoint?.year ?? null
}

/**
 * First metric flagged for county cards (state index), in priority order, only if supported + data present.
 */
export function getCountyCardHighlight(
  stateSlug: string,
  countyMetrics: Partial<Record<MetricKey, MetricSeries | undefined>> | undefined
): ResolvedDisplayMetric | null {
  const resolved = resolveDisplayMetrics({
    stateSlug,
    geographyLevel: 'county',
    metrics: countyMetrics,
  })
  for (const m of resolved) {
    if (m.catalog.useOnCountyCard && m.show) return m
  }
  return resolved.find(m => m.show) ?? null
}

/**
 * First metric for county hero subtitle (same rules as legacy NJ “average bill” line).
 */
export function getCountyHeroHighlight(
  stateSlug: string,
  countyMetrics: Partial<Record<MetricKey, MetricSeries | undefined>> | undefined
): ResolvedDisplayMetric | null {
  const resolved = resolveDisplayMetrics({
    stateSlug,
    geographyLevel: 'county',
    metrics: countyMetrics,
  })
  for (const m of resolved) {
    if (m.catalog.useOnCountyHero && m.show) return m
  }
  return resolved.find(m => m.show) ?? null
}

/** County trends chart metric (average tax bill series only when supported + data) */
export function shouldShowCountyAverageTaxBillTrend(stateSlug: string): boolean {
  const av = getMetricAvailability(stateSlug, 'county', 'averageResidentialTaxBill')
  if (av == null) return true
  return av.supported === true
}
