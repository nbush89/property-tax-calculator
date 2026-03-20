/**
 * Global catalog: metric keys and UI metadata (single source of truth for labels/format/order).
 */

import type { MetricKey } from './metricKeys'

export type { MetricKey } from './metricKeys'

export type MetricFormat = 'percent' | 'currency' | 'number'

export type MetricCatalogEntry = {
  key: MetricKey
  label: string
  shortLabel?: string
  description?: string
  format: MetricFormat
  /** Lower sorts earlier */
  priority: number
  /** Reasonable default for naive cross-state comparison when semantics align */
  defaultComparable: boolean
  defaultCaveat?: string
  /** Prefer this metric for county summary lines on state index cards when present */
  useOnCountyCard?: boolean
  /** Prefer for county page hero subtitle */
  useOnCountyHero?: boolean
}

export const METRIC_CATALOG: Record<MetricKey, MetricCatalogEntry> = {
  averageResidentialTaxBill: {
    key: 'averageResidentialTaxBill',
    label: 'Average residential tax bill',
    shortLabel: 'Avg tax bill',
    description:
      'Typical or average residential property tax bill for the area, from published reports where available.',
    format: 'currency',
    priority: 10,
    defaultComparable: true,
    useOnCountyCard: true,
    useOnCountyHero: true,
  },
  effectiveTaxRate: {
    key: 'effectiveTaxRate',
    label: 'Effective tax rate',
    shortLabel: 'Effective rate',
    description:
      'Effective property tax rate used for planning comparisons. Definition may vary by state data source.',
    format: 'percent',
    priority: 20,
    defaultComparable: false,
    defaultCaveat:
      'Effective rate definitions differ by state; use for within-state comparison unless noted.',
    useOnCountyCard: true,
    useOnCountyHero: true,
  },
  medianHomeValue: {
    key: 'medianHomeValue',
    label: 'Median home value',
    shortLabel: 'Median home value',
    description: 'Median owner-occupied home value (typically ACS 5-year).',
    format: 'currency',
    priority: 30,
    defaultComparable: true,
    useOnCountyCard: false,
    useOnCountyHero: false,
  },
  averageTaxRate: {
    key: 'averageTaxRate',
    label: 'Average tax rate',
    shortLabel: 'Avg rate',
    description: 'Statewide or aggregate average tax rate where published.',
    format: 'percent',
    priority: 40,
    defaultComparable: false,
    useOnCountyCard: false,
    useOnCountyHero: false,
  },
}

/** Stable iteration order for resolution */
export function getMetricKeysByPriority(): MetricKey[] {
  return (Object.keys(METRIC_CATALOG) as MetricKey[]).sort(
    (a, b) => METRIC_CATALOG[a].priority - METRIC_CATALOG[b].priority
  )
}
