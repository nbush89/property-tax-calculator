/**
 * Helper functions for working with town data and metrics
 * Provides safe fallback logic: town metric -> county metric -> undefined
 */

import type {
  TownDataPoint,
  TownData,
  CountyData,
  StateData,
  SourceReference,
  MetricSeries,
  MetricDatapoint,
} from './types'

/**
 * Get the latest (most recent) datapoint from a town series
 * @param series - Array of town datapoints (should be sorted by year ascending)
 * @returns The latest datapoint, or undefined if series is empty
 */
export function getLatest(series?: TownDataPoint[]): TownDataPoint | undefined {
  if (!series || series.length === 0) {
    return undefined
  }

  // Series should be sorted ascending, so last item is latest
  return series[series.length - 1]
}

/**
 * Get the last N years of data from a town series
 * @param series - Array of town datapoints
 * @param n - Number of years to return (default: 5)
 * @returns Array of the last N datapoints, or all if fewer than N
 */
export function getLastN(series?: TownDataPoint[], n: number = 5): TownDataPoint[] {
  if (!series || series.length === 0) {
    return []
  }

  return series.slice(-n)
}

/**
 * Compute year-over-year changes for a town series
 * @param series - Array of town datapoints (should have at least 2 points)
 * @returns Array of datapoints with delta and deltaPct added
 */
export function computeYoY(
  series?: TownDataPoint[]
): Array<TownDataPoint & { delta?: number; deltaPct?: number }> {
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
 * @param stateData - State data containing sources map
 * @param sourceRef - Source reference key
 * @returns SourceReference object, or undefined if not found
 */
export function resolveSource(
  stateData: StateData,
  sourceRef: string
): SourceReference | undefined {
  if (!stateData.sources) {
    return undefined
  }

  return stateData.sources[sourceRef]
}

/**
 * Get a metric series for a town, falling back to county if town doesn't have it
 * @param params - Object containing town, county, and metricKey
 * @returns TownDataPoint[] or MetricSeries (from county), or undefined
 */
export function getMetricSeries(params: {
  town?: TownData
  county: CountyData
  metricKey: 'averageResidentialTaxBill' | 'effectiveTaxRate' | 'medianHomeValue'
}): TownDataPoint[] | MetricSeries | undefined {
  const { town, county, metricKey } = params

  // Try town metrics first
  if (town?.metrics) {
    const townSeries = town.metrics[metricKey]
    if (townSeries && townSeries.length > 0) {
      return townSeries
    }
  }

  // Fall back to county metrics
  if (county.metrics) {
    // Map metric keys: town keys may differ from county keys
    let countyKey: keyof typeof county.metrics | undefined

    if (metricKey === 'averageResidentialTaxBill') {
      countyKey = 'averageResidentialTaxBill'
    } else if (metricKey === 'effectiveTaxRate') {
      countyKey = 'effectiveTaxRate'
    }

    if (countyKey && county.metrics[countyKey]) {
      return county.metrics[countyKey]
    }
  }

  return undefined
}

/**
 * Get the latest datapoint for a metric, falling back from town to county
 * @param params - Object containing town, county, and metricKey
 * @returns Latest datapoint (TownDataPoint or MetricDatapoint), or undefined
 */
export function getMetricLatest(params: {
  town?: TownData
  county: CountyData
  metricKey: 'averageResidentialTaxBill' | 'effectiveTaxRate' | 'medianHomeValue'
}): TownDataPoint | MetricDatapoint | undefined {
  const series = getMetricSeries(params)

  if (!series) {
    return undefined
  }

  // Handle both TownDataPoint[] and MetricSeries
  if (series.length === 0) {
    return undefined
  }

  // Both types have year and value, so we can safely return the last item
  return series[series.length - 1] as TownDataPoint | MetricDatapoint
}

/**
 * Assert that a series is sorted by year ascending (dev-only validation)
 * @param series - Array of datapoints
 * @param seriesName - Name of the series for error messages
 */
export function assertSortedByYear(
  series?: TownDataPoint[] | MetricSeries,
  seriesName: string = 'series'
): void {
  if (process.env.NODE_ENV !== 'development') {
    return // No-op in production
  }

  if (!series || series.length <= 1) {
    return // Empty or single-item series are trivially sorted
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
