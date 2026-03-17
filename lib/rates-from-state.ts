/**
 * County and municipal rates derived from state JSON (single source of truth).
 * Used by the calculator, rate tables, and dropdowns instead of static nj_county_rates / nj_municipal_rates.
 */

import type { StateData, CountyData, TownData } from '@/lib/data/types'
import { getLatestValue } from '@/lib/data/metrics'

/**
 * Get county effective tax rate as decimal (e.g. 0.0185 for 1.85%).
 * Uses county.metrics.effectiveTaxRate latest value (stored in percent); returns value/100.
 */
export function getCountyRate(stateData: StateData | null, countyName: string): number | null {
  if (!stateData?.counties?.length) return null
  const county = stateData.counties.find(
    (c) => c.name.toLowerCase() === countyName.toLowerCase()
  ) as CountyData | undefined
  if (!county?.metrics?.effectiveTaxRate?.length) return null
  const value = getLatestValue(county.metrics.effectiveTaxRate)
  if (value == null) return null
  return value / 100
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
 */
export function getMunicipalRatesByCountyFromState(
  stateData: StateData | null
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  if (!stateData?.counties?.length) return out
  for (const c of stateData.counties) {
    const byTown: Record<string, number> = {}
    for (const t of c.towns ?? []) {
      const rate = getMunicipalRate(stateData, c.name, t.name)
      if (rate != null) byTown[t.name] = rate
    }
    if (Object.keys(byTown).length) out[c.name] = byTown
  }
  return out
}
