/**
 * Helper functions for working with town data and metrics
 * Provides safe fallback logic: town metric -> county metric -> undefined
 */

import type { DataPoint, TownData, CountyData, StateData, Source, MetricSeries } from './types'

/**
 * Get the latest (most recent) datapoint from a series
 */
export function getLatest(series?: DataPoint[]): DataPoint | undefined {
  if (!series || series.length === 0) {
    return undefined
  }
  return series[series.length - 1]
}

/**
 * Get the last N years of data from a series
 */
export function getLastN(series?: DataPoint[], n: number = 5): DataPoint[] {
  if (!series || series.length === 0) {
    return []
  }
  return series.slice(-n)
}

/**
 * Return the latest (max) year from a series, or null if empty/undefined.
 */
export function getLatestYear(series: DataPoint[] | undefined): number | null {
  if (!series || series.length === 0) return null
  const years = series.map(d => d.year).filter(y => Number.isFinite(y))
  return years.length > 0 ? Math.max(...years) : null
}

/**
 * Return start/end year range when series has at least 2 points; otherwise null.
 */
export function getYearRange(
  series: DataPoint[] | undefined
): { start: number; end: number } | null {
  if (!series || series.length < 2) return null
  const years = series.map(d => d.year).filter(y => Number.isFinite(y))
  if (years.length < 2) return null
  return { start: Math.min(...years), end: Math.max(...years) }
}

/**
 * Format a year label for a series: "(YYYY)" for latest only, "(YYYY–YYYY)" for range, else "".
 */
export function formatYearLabelForSeries(series: DataPoint[] | undefined): string {
  const latest = getLatestYear(series)
  const range = getYearRange(series)
  if (range != null && range.start !== range.end) {
    return ` (${range.start}–${range.end})`
  }
  if (latest != null) return ` (${latest})`
  return ''
}

/**
 * Compute year-over-year changes for a series
 */
export function computeYoY(
  series?: DataPoint[]
): Array<DataPoint & { delta?: number; deltaPct?: number }> {
  if (!series || series.length < 2) {
    return series || []
  }

  return series.map((datapoint, index) => {
    if (index === 0) {
      return datapoint
    }

    const previous = series[index - 1]
    const delta = datapoint.value - previous.value
    const deltaPct = previous.value !== 0 ? (delta / previous.value) * 100 : undefined

    return {
      ...datapoint,
      delta,
      deltaPct: deltaPct !== undefined ? Math.round(deltaPct * 100) / 100 : undefined,
    }
  })
}

/**
 * Resolve a source reference key to the full source object
 */
export function resolveSource(stateData: StateData, sourceRef: string): Source | undefined {
  if (!stateData.sources) {
    return undefined
  }
  return stateData.sources[sourceRef]
}

/**
 * Resolve a source URL for a specific year
 * Returns year-specific URL if available, otherwise homepage URL
 */
export function resolveSourceUrl(
  stateData: StateData,
  sourceRef: string,
  year: number
): string | undefined {
  const source = resolveSource(stateData, sourceRef)
  if (!source) {
    return undefined
  }

  // Try year-specific URL first
  if (source.yearUrls && source.yearUrls[String(year)]) {
    return source.yearUrls[String(year)]
  }

  // Fall back to homepage URL
  return source.homepageUrl
}

/**
 * Get a metric series for a town, falling back to county if town doesn't have it
 */
export function getMetricSeries(params: {
  town?: TownData
  county: CountyData
  metricKey: 'averageResidentialTaxBill' | 'effectiveTaxRate' | 'medianHomeValue'
}): DataPoint[] | MetricSeries | undefined {
  const { town, county, metricKey } = params

  // Try town metrics first
  if (town?.metrics) {
    const townSeries = town.metrics[metricKey]
    if (townSeries && townSeries.length > 0) {
      return townSeries
    }
  }

  // Fall back to county metrics (only for averageResidentialTaxBill and effectiveTaxRate)
  if (county.metrics) {
    if (metricKey === 'averageResidentialTaxBill' && county.metrics.averageResidentialTaxBill) {
      return county.metrics.averageResidentialTaxBill
    }
    if (metricKey === 'effectiveTaxRate' && county.metrics.effectiveTaxRate) {
      return county.metrics.effectiveTaxRate
    }
  }

  return undefined
}

/**
 * Get the latest datapoint for a metric, falling back from town to county
 */
export function getMetricLatest(params: {
  town?: TownData
  county: CountyData
  metricKey: 'averageResidentialTaxBill' | 'effectiveTaxRate' | 'medianHomeValue'
}): DataPoint | undefined {
  const series = getMetricSeries(params)

  if (!series || series.length === 0) {
    return undefined
  }

  return series[series.length - 1]
}

/**
 * Assert that a series is sorted by year ascending (dev-only validation)
 */
export function assertSortedByYear(
  series?: DataPoint[] | MetricSeries,
  seriesName: string = 'series'
): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  if (!series || series.length <= 1) {
    return
  }

  for (let i = 1; i < series.length; i++) {
    const current = series[i]
    const previous = series[i - 1]

    if (current.year < previous.year) {
      console.error(
        `${seriesName} is not sorted by year ascending. ` +
          `Found year ${current.year} after ${previous.year}`
      )
      break
    }
  }
}
