/**
 * Texas official property tax rates — scaffold for Comptroller/CAD integration.
 * Stub returns empty maps; does not throw.
 */
import type { CountyMetricsPayload, TownMetricsPayload } from '../../lib/state-metrics-types'
import { buildSeries } from '../../lib/build-series'
import { TX_RATES_SOURCE_REF } from './config'

export type TexasCountyList = Array<{
  slug: string
  name?: string
  towns?: Array<{ name: string; slug: string }>
}>

export async function fetchTexasRateMapsForYears(
  _years: number[],
  log: (m: string) => void
): Promise<Map<number, Map<string, number>>> {
  log('[INFO] Texas official rate sourcing scaffold active; no rate data merged yet')
  return new Map<number, Map<string, number>>()
}

/**
 * Merge town effective rates from rate maps. Keys in rateMaps should match townsOut keys:
 * `${countySlug}/${townSlug}` → effective rate % per year.
 */
export function mergeTownEffectiveFromTexasRates(
  townsOut: Record<string, TownMetricsPayload>,
  years: number[],
  rateMaps: Map<number, Map<string, number>>,
  log: (m: string) => void
): void {
  if (rateMaps.size === 0 || years.length === 0) return
  for (const townKey of Object.keys(townsOut)) {
    const effByYear: Record<number, number | undefined> = {}
    for (const y of years) {
      const m = rateMaps.get(y)
      if (m) effByYear[y] = m.get(townKey)
    }
    const series = buildSeries(effByYear, 'PERCENT', TX_RATES_SOURCE_REF)
    if (series.length) {
      townsOut[townKey] ??= {}
      townsOut[townKey].effectiveTaxRate = series
      log(`[OK] Texas rates merged for town key ${townKey}`)
    }
  }
}

/**
 * County-level effective rate series from Texas rate maps (e.g. county average or county total rate).
 * Stub: empty. Future: key by county slug in rateMaps entries.
 */
export function buildCountyEffectiveFromTexasRates(
  _countiesList: TexasCountyList,
  _years: number[],
  _rateMaps: Map<number, Map<string, number>>
): Record<string, CountyMetricsPayload> {
  return {}
}
