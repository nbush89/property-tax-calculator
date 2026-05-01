/**
 * County and municipal rates derived from state JSON (single source of truth).
 * Used by the calculator, rate tables, and dropdowns instead of static nj_county_rates / nj_municipal_rates.
 */

import type { StateData, CountyData, TownData } from '@/lib/data/types'
import { getLatestValue, getLatestYear } from '@/lib/data/metrics'

/**
 * Get county effective tax rate as decimal together with the sourceRef of the latest data point.
 * Use this when the caller needs to branch on whether the rate is ACS-derived vs Comptroller.
 */
export function getCountyRateWithSource(
  stateData: StateData | null,
  countyName: string
): { rate: number; sourceRef: string } | null {
  if (!stateData?.counties?.length) return null
  const county = stateData.counties.find(
    (c) => c.name.toLowerCase() === countyName.toLowerCase()
  ) as CountyData | undefined
  if (!county?.metrics?.effectiveTaxRate?.length) return null
  const series = county.metrics.effectiveTaxRate
  const latest = series[series.length - 1]
  if (latest?.value == null) return null
  return { rate: latest.value / 100, sourceRef: latest.sourceRef ?? '' }
}

/**
 * Get county effective tax rate as decimal (e.g. 0.0185 for 1.85%).
 * Uses county.metrics.effectiveTaxRate latest value (stored in percent); returns value/100.
 */
export function getCountyRate(stateData: StateData | null, countyName: string): number | null {
  return getCountyRateWithSource(stateData, countyName)?.rate ?? null
}

/**
 * Get municipal (town) rate as decimal (e.g. 0.0028 for 0.28%).
 * Uses town.avgRate when present, else latest from town.metrics.effectiveTaxRate (value/100).
 * Note: avgRate is the municipal component; effectiveTaxRate is full effective rate.
 */
export function getMunicipalRate(
  stateData: StateData | null,
  countyName: string,
  townName: string
): number | null {
  if (!stateData?.counties?.length || !townName?.trim()) return null
  const county = stateData.counties.find(
    (c) => c.name.toLowerCase() === countyName.toLowerCase()
  ) as CountyData | undefined
  if (!county?.towns?.length) return null
  const town = county.towns.find(
    (t) => t.name.toLowerCase() === townName.toLowerCase()
  ) as TownData | undefined
  if (!town) return null
  if (typeof town.avgRate === 'number' && Number.isFinite(town.avgRate)) return town.avgRate
  const value = getLatestValue(town.metrics?.effectiveTaxRate)
  if (value != null) return value / 100
  return null
}

/**
 * County display names for dropdowns (from state JSON).
 */
export function getCountyNames(stateData: StateData | null): string[] {
  if (!stateData?.counties?.length) return []
  return stateData.counties.map((c) => c.name).filter(Boolean).sort()
}

/**
 * Municipality (town) names for a county (from state JSON).
 */
export function getMunicipalitiesByCounty(
  stateData: StateData | null,
  countyName: string
): string[] {
  if (!stateData?.counties?.length || !countyName?.trim()) return []
  const county = stateData.counties.find(
    (c) => c.name.toLowerCase() === countyName.toLowerCase()
  )
  if (!county?.towns?.length) return []
  return county.towns.map((t) => t.name).filter(Boolean).sort()
}

/**
 * All municipalities by county name (for passing to TaxForm dropdowns).
 */
export function getMunicipalitiesByCountyMap(
  stateData: StateData | null
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!stateData?.counties?.length) return out
  for (const c of stateData.counties) {
    out[c.name] = getMunicipalitiesByCounty(stateData, c.name)
  }
  return out
}

/**
 * All county rates as decimal by county name (for rates table page).
 * Keys: county name, value: rate as decimal.
 */
export function getAllCountyRatesFromState(
  stateData: StateData | null
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!stateData?.counties?.length) return out
  for (const c of stateData.counties) {
    const rate = getCountyRate(stateData, c.name)
    if (rate != null) out[c.name] = rate
  }
  return out
}

/**
 * Municipal rates by county name then town name (for rates table page).
 * Structure: { [countyName]: { [townName]: rateDecimal } }
 * Only includes towns where rollout.isReady !== false, so unfinished town pages
 * are not linked from the public rates table.
 */
export function getMunicipalRatesByCountyFromState(
  stateData: StateData | null
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  if (!stateData?.counties?.length) return out
  for (const c of stateData.counties) {
    const byTown: Record<string, number> = {}
    for (const t of c.towns ?? []) {
      // Skip towns explicitly marked as not ready — they don't have a public page yet
      if (t.rollout?.isReady === false) continue
      const rate = getMunicipalRate(stateData, c.name, t.name)
      if (rate != null) byTown[t.name] = rate
    }
    if (Object.keys(byTown).length) out[c.name] = byTown
  }
  return out
}

/**
 * Tax year for the county rate displayed by getCountyRate (latest point in effectiveTaxRate series).
 */
export function getCountyEffectiveTaxRateYear(
  stateData: StateData | null,
  countyName: string
): number | null {
  const county = stateData?.counties?.find(
    c => c.name.toLowerCase() === countyName.toLowerCase()
  )
  return getLatestYear(county?.metrics?.effectiveTaxRate) ?? null
}

/**
 * Tax year for the municipal rate from getMunicipalRate: series latest, else town.asOfYear when only avgRate.
 */
export function getTownEffectiveTaxRateYear(
  stateData: StateData | null,
  countyName: string,
  townName: string
): number | null {
  const county = stateData?.counties?.find(
    c => c.name.toLowerCase() === countyName.toLowerCase()
  )
  const town = county?.towns?.find(t => t.name.toLowerCase() === townName.toLowerCase())
  if (!town) return null
  const fromSeries = getLatestYear(town.metrics?.effectiveTaxRate)
  if (fromSeries != null) return fromSeries
  if (typeof town.avgRate === 'number' && Number.isFinite(town.avgRate)) {
    return (
      town.asOfYear ??
      town.overview?.effectiveTaxRateYear ??
      town.overview?.asOfYear ??
      null
    )
  }
  return null
}

/**
 * Newest tax year across all county/town effective-rate data in the state (for page-level copy).
 */
export function getMaxEffectiveTaxRateYearInState(stateData: StateData | null): number | null {
  if (!stateData?.counties?.length) return null
  let max: number | null = null
  for (const c of stateData.counties) {
    const yc = getLatestYear(c.metrics?.effectiveTaxRate)
    if (yc != null && (max == null || yc > max)) max = yc
    for (const t of c.towns ?? []) {
      let yt = getLatestYear(t.metrics?.effectiveTaxRate)
      if (yt == null && typeof t.avgRate === 'number' && Number.isFinite(t.avgRate)) {
        yt =
          t.asOfYear ?? t.overview?.effectiveTaxRateYear ?? t.overview?.asOfYear ?? null
      }
      if (yt != null && (max == null || yt > max)) max = yt
    }
  }
  return max
}
