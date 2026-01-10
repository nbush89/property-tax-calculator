/**
 * Helper functions for working with year-aware metric time series
 */

import type { MetricSeries, DataPoint } from './types'

/**
 * Get the latest (most recent) datapoint from a series
 * @param series - Array of metric datapoints (should be sorted by year ascending)
 * @returns The latest datapoint, or null if series is empty
 */
export function getLatest(series: MetricSeries | undefined): DataPoint | null {
  if (!series || series.length === 0) {
    return null
  }

  // Series should be sorted ascending, so last item is latest
  return series[series.length - 1]
}

/**
 * Get the last N years of data from a series
 * @param series - Array of metric datapoints
 * @param n - Number of years to return (default: 5)
 * @returns Array of the last N datapoints, or all if fewer than N
 */
export function getLastN(series: MetricSeries | undefined, n: number = 5): MetricSeries {
  if (!series || series.length === 0) {
    return []
  }

  return series.slice(-n)
}

/**
 * Compute year-over-year change percentage
 * @param series - Array of metric datapoints (should have at least 2 points)
 * @returns Year-over-year change percentage, or null if insufficient data
 */
export function computeYoY(series: MetricSeries | undefined): number | null {
  if (!series || series.length < 2) {
    return null
  }

  const latest = series[series.length - 1]
  const previous = series[series.length - 2]

  if (previous.value === 0) {
    return null // Avoid division by zero
  }

  const change = ((latest.value - previous.value) / previous.value) * 100
  return Math.round(change * 100) / 100 // Round to 2 decimal places
}

/**
 * Compute comprehensive YoY and 5-year change statistics
 * @param series - Array of metric datapoints (should be sorted by year ascending)
 * @returns Object with latest values, YoY change, and optional 5-year change, or null if insufficient data
 */
export function computeYoYStats(series: MetricSeries | undefined): {
  latestYear: number
  latestValue: number
  prevYear: number
  prevValue: number
  delta: number
  deltaPct: number
  fiveYearDelta?: number
  fiveYearDeltaPct?: number
} | null {
  if (!series || series.length < 2) {
    return null
  }

  // Ensure series is sorted by year ascending
  const sorted = [...series].sort((a, b) => a.year - b.year)

  const latest = sorted[sorted.length - 1]
  const previous = sorted[sorted.length - 2]

  const delta = latest.value - previous.value
  const deltaPct = previous.value !== 0 ? (delta / previous.value) * 100 : 0

  const result: {
    latestYear: number
    latestValue: number
    prevYear: number
    prevValue: number
    delta: number
    deltaPct: number
    fiveYearDelta?: number
    fiveYearDeltaPct?: number
  } = {
    latestYear: latest.year,
    latestValue: latest.value,
    prevYear: previous.year,
    prevValue: previous.value,
    delta: Math.round(delta * 100) / 100, // Round to 2 decimal places
    deltaPct: Math.round(deltaPct * 100) / 100, // Round to 2 decimal places
  }

  // Calculate 5-year change if we have at least 2 points (oldest vs latest)
  if (sorted.length >= 2) {
    const oldest = sorted[0]
    const fiveYearDelta = latest.value - oldest.value
    const fiveYearDeltaPct = oldest.value !== 0 ? (fiveYearDelta / oldest.value) * 100 : 0

    result.fiveYearDelta = Math.round(fiveYearDelta * 100) / 100
    result.fiveYearDeltaPct = Math.round(fiveYearDeltaPct * 100) / 100
  }

  return result
}

/**
 * Assert that a series is sorted by year ascending (dev-only validation)
 * @param series - Array of metric datapoints
 * @param seriesName - Name of the series for error messages
 * @throws Error if series is not sorted correctly
 */
export function assertSorted(
  series: MetricSeries | undefined,
  seriesName: string = 'series'
): void {
  if (!series || series.length <= 1) {
    return // Empty or single-item series are trivially sorted
  }

  for (let i = 1; i < series.length; i++) {
    if (series[i].year < series[i - 1].year) {
      throw new Error(
        `${seriesName} is not sorted by year ascending. ` +
          `Found year ${series[i].year} after ${series[i - 1].year}`
      )
    }
  }
}

/**
 * Get the value from the latest datapoint (convenience function)
 * @param series - Array of metric datapoints
 * @returns The numeric value of the latest datapoint, or null if series is empty
 */
export function getLatestValue(series: MetricSeries | undefined): number | null {
  const latest = getLatest(series)
  return latest ? latest.value : null
}

/**
 * Get the year from the latest datapoint (convenience function)
 * @param series - Array of metric datapoints
 * @returns The year of the latest datapoint, or null if series is empty
 */
export function getLatestYear(series: MetricSeries | undefined): number | null {
  const latest = getLatest(series)
  return latest ? latest.year : null
}

/**
 * Validate that a series has no more than 5 items
 * @param series - Array of metric datapoints
 * @param seriesName - Name of the series for error messages
 * @throws Error if series has more than 5 items
 */
export function assertMaxLength(
  series: MetricSeries | undefined,
  seriesName: string = 'series'
): void {
  if (series && series.length > 5) {
    throw new Error(`${seriesName} has ${series.length} items, but maximum allowed is 5`)
  }
}
