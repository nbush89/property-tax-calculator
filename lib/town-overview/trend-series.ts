/**
 * Pick the best historical series for town-page trend blocks (town-first, then county).
 */

import type { TownData, CountyData, DataPoint } from '@/lib/data/types'
import type { TownCountyMetricKey } from '@/lib/data/town-helpers'

export type TrendSeriesPick = {
  points: Array<{ year: number; value: number }>
  metricKey: TownCountyMetricKey
  scope: 'town' | 'county'
}

function normalizePoints(series: DataPoint[]): Array<{ year: number; value: number }> {
  return series
    .filter(d => d.year != null && d.value != null && Number.isFinite(d.value))
    .map(d => ({ year: d.year, value: d.value }))
    .sort((a, b) => a.year - b.year)
}

function pickTownSeries(
  town: TownData,
  key: TownCountyMetricKey,
  minLen: number
): Array<{ year: number; value: number }> | null {
  const raw = town.metrics?.[key]
  if (!raw || raw.length < minLen) return null
  const pts = normalizePoints(raw)
  return pts.length >= minLen ? pts : null
}

function pickCountySeries(
  county: CountyData,
  key: TownCountyMetricKey,
  minLen: number
): Array<{ year: number; value: number }> | null {
  if (key === 'medianHomeValue') {
    return null
  }
  if (key === 'averageResidentialTaxBill') {
    const raw = county.metrics?.averageResidentialTaxBill
    if (!raw || raw.length < minLen) return null
    const pts = normalizePoints(raw)
    return pts.length >= minLen ? pts : null
  }
  const raw = county.metrics?.effectiveTaxRate
  if (!raw || raw.length < minLen) return null
  const pts = normalizePoints(raw)
  return pts.length >= minLen ? pts : null
}

const MIN_POINTS = 3

const PRIORITY: TownCountyMetricKey[] = [
  'averageResidentialTaxBill',
  'effectiveTaxRate',
  'medianHomeValue',
]

/**
 * Prefer town-level series when long enough; else county for same metric in order.
 */
export function pickBestTrendSeries(town: TownData, county: CountyData): TrendSeriesPick | null {
  for (const key of PRIORITY) {
    const townPts = pickTownSeries(town, key, MIN_POINTS)
    if (townPts) return { points: townPts, metricKey: key, scope: 'town' }
  }
  for (const key of PRIORITY) {
    const countyPts = pickCountySeries(county, key, MIN_POINTS)
    if (countyPts) return { points: countyPts, metricKey: key, scope: 'county' }
  }
  return null
}
