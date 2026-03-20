/**
 * Apply a picked trend series to TownOverview trend* fields (when JSON did not supply them).
 */

import type { TownOverview } from './types'

function computeTrendPct(series: Array<{ year: number; value: number }>): number | null {
  if (series.length < 2) return null
  const first = series[0]!.value
  const last = series[series.length - 1]!.value
  if (first === 0) return null
  return ((last - first) / first) * 100
}

/**
 * Mutates overview when it lacks a usable trendSeries attach pick from metrics.
 */
export function applyTrendPickToOverview(
  overview: TownOverview,
  pick: {
    points: Array<{ year: number; value: number }>
  } | null
): void {
  if (!pick || pick.points.length < 3) return
  if (overview.trendSeries && overview.trendSeries.length >= 3) return

  const sorted = [...pick.points].sort((a, b) => a.year - b.year)
  const pct = computeTrendPct(sorted)
  const startYear = sorted[0]!.year
  const endYear = sorted[sorted.length - 1]!.year

  overview.trendSeries = sorted
  if (pct != null) overview.trendPct = pct
  overview.trendStartYear = startYear
  overview.trendEndYear = endYear

  if (sorted.length >= 5) {
    const last5 = sorted.slice(-5)
    const fivePct = computeTrendPct(last5)
    if (fivePct != null) {
      overview.fiveYearTrendPct = fivePct
      overview.trend5y = {
        startYear: last5[0]!.year,
        endYear: last5[last5.length - 1]!.year,
        direction: fivePct > 0 ? 'up' : fivePct < 0 ? 'down' : 'flat',
        pctChange: fivePct,
        series: last5,
      }
    }
  }
}
