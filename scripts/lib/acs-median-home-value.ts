import * as https from 'node:https'
import type { DataPoint } from './state-metrics-types'
import { buildSeries } from './build-series'

export const ACS_DATASET = 'acs/acs5/profile'
export const ACS_VAR_MEDIAN_HOME_VALUE = 'DP04_0089E'
/**
 * ACS B25103_001E: Median real estate taxes paid (all owner-occupied units).
 * From the detailed table B25103 "Mortgage Status by Median Real Estate Taxes Paid".
 * Captures the combined bill across all overlapping taxing units (county + city
 * + school district + special districts), net of homestead exemptions applied.
 * This is the best place-level proxy available for a homeowner's total annual
 * bill without requiring address-level taxing-unit lookups.
 *
 * Note: this is from the acs/acs5 detailed dataset, NOT the acs/acs5/profile
 * endpoint — they must be fetched separately.
 */
export const ACS_VAR_MEDIAN_TAXES_PAID = 'B25103_001E'
export const ACS_TAX_DATASET = 'acs/acs5'
export const ACS_SOURCE_REF = 'us_census_acs_profile_dp04'
export const ACS_TAX_SOURCE_REF = 'us_census_acs_b25103'

const USER_AGENT = 'state-metrics-script/1.0'

export function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': USER_AGENT } }, res => {
        const status = res.statusCode ?? 0
        if (status < 200 || status >= 300) {
          reject(new Error(`HTTP ${status} for ${url}`))
          res.resume()
          return
        }
        let data = ''
        res.setEncoding('utf8')
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

/** Internal: Census suppressed / unavailable sentinel value */
const CENSUS_SUPPRESSED_NUM = -666666666

/**
 * ACS B25103 top-codes the median real estate taxes at $10,000 and reports
 * the value as 10001 when the true median is at or above that threshold.
 * This is not a real dollar figure — treat it as "data unavailable".
 */
export const ACS_B25103_TOP_CODE = 10001

/** NJ: "Hoboken city, New Jersey" -> token match style used by tier1 script */
export function normalizePlaceNameNj(raw: string): string {
  const primary = raw.split(',')[0]?.trim().toUpperCase() ?? raw.toUpperCase()
  return primary
    .replace(/\b(CITY|TOWN|TOWNSHIP|TWP|BOROUGH|BORO|VILLAGE)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Texas ACS place key: align with how we look up from display names.
 * Census uses "Houston city, Texas" — without stripping suffixes the map key is
 * "HOUSTON CITY" while "Houston, Texas" becomes "HOUSTON" and never matches.
 */
export function normalizePlaceNameTexasAcsKey(raw: string): string {
  const primary = raw.split(',')[0]?.trim().toUpperCase() ?? raw.toUpperCase()
  return primary
    .replace(/\b(CITY|TOWN|TOWNSHIP|TWP|BOROUGH|BORO|VILLAGE|CDP)\b/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @deprecated Use normalizePlaceNameTexasAcsKey for Texas ACS matching */
export function normalizePlaceNameTexas(name: string): string {
  return normalizePlaceNameTexasAcsKey(name)
}

export type AcsPlaceStyle = 'nj' | 'texas'

function normalizeForStyle(rawName: string, style: AcsPlaceStyle): string {
  return style === 'nj' ? normalizePlaceNameNj(rawName) : normalizePlaceNameTexasAcsKey(rawName)
}

function isValidAcsValue(v: string): boolean {
  if (!v) return false
  const n = Number(v)
  return Number.isFinite(n) && n !== CENSUS_SUPPRESSED_NUM && n >= 0
}

/**
 * ACS DP04 fetch: pulls median home value (DP04_0089E) from acs/acs5/profile.
 * Returns a Map keyed by normalised place name.
 */
export async function fetchAcsDp04Maps(
  year: number,
  stateFips: string,
  style: AcsPlaceStyle
): Promise<{ homeValue: Map<string, number>; taxesPaid: Map<string, number> }> {
  const url = `https://api.census.gov/data/${year}/${ACS_DATASET}?get=NAME,${ACS_VAR_MEDIAN_HOME_VALUE}&for=place:*&in=state:${stateFips}`
  const rows = (await fetchJson(url)) as string[][]
  const header = rows[0]
  const nameIdx = header.indexOf('NAME')
  const mhvIdx = header.indexOf(ACS_VAR_MEDIAN_HOME_VALUE)

  const homeValue = new Map<string, number>()

  for (const r of rows.slice(1)) {
    const key = normalizeForStyle(r[nameIdx], style)
    const mhv = r[mhvIdx]
    if (isValidAcsValue(mhv)) homeValue.set(key, Number(mhv))
  }
  // taxesPaid is now fetched separately via fetchAcsMedianTaxesPaidMap (B25103)
  return { homeValue, taxesPaid: new Map() }
}

/**
 * ACS B25103 fetch: pulls median real estate taxes paid (B25103_001E) from
 * the acs/acs5 detailed dataset (NOT the profile endpoint).
 * B25103 = "Mortgage Status by Median Real Estate Taxes Paid (Dollars)".
 * B25103_001E = total (all owner-occupied units, regardless of mortgage status).
 * Returns a Map keyed by normalised place name.
 */
export async function fetchAcsMedianTaxesPaidMap(
  year: number,
  stateFips: string,
  style: AcsPlaceStyle
): Promise<Map<string, number>> {
  const url = `https://api.census.gov/data/${year}/${ACS_TAX_DATASET}?get=NAME,${ACS_VAR_MEDIAN_TAXES_PAID}&for=place:*&in=state:${stateFips}`
  const rows = (await fetchJson(url)) as string[][]
  const header = rows[0]
  const nameIdx = header.indexOf('NAME')
  const taxIdx = header.indexOf(ACS_VAR_MEDIAN_TAXES_PAID)

  const taxesPaid = new Map<string, number>()
  for (const r of rows.slice(1)) {
    const key = normalizeForStyle(r[nameIdx], style)
    const tax = r[taxIdx]
    // Exclude top-coded values (10001 = "≥$10,000" sentinel — not a real figure)
    if (isValidAcsValue(tax) && Number(tax) !== ACS_B25103_TOP_CODE) {
      taxesPaid.set(key, Number(tax))
    }
  }
  return taxesPaid
}

/**
 * Census ACS5 profile: median home value for all places in a state.
 * @deprecated Prefer fetchAcsDp04Maps to get both variables in one call.
 */
export async function fetchAcsMedianHomeValueMap(
  year: number,
  stateFips: string,
  style: AcsPlaceStyle
): Promise<Map<string, number>> {
  const { homeValue } = await fetchAcsDp04Maps(year, stateFips, style)
  return homeValue
}

function acsKeyForTown(townDisplayName: string, stateLabel: string, style: AcsPlaceStyle): string {
  const raw = `${townDisplayName}, ${stateLabel}`
  return style === 'nj' ? normalizePlaceNameNj(raw) : normalizePlaceNameTexasAcsKey(raw)
}

export function medianHomeSeriesForTown(
  townDisplayName: string,
  stateLabel: string,
  acsYears: number[],
  acsMaps: Map<number, Map<string, number>>,
  style: AcsPlaceStyle
): { series: DataPoint[]; acsMatchKey: string } {
  const acsKey = acsKeyForTown(townDisplayName, stateLabel, style)
  const medianByYear: Record<number, number | undefined> = {}
  for (const y of acsYears) {
    const map = acsMaps.get(y)
    if (map) medianByYear[y] = map.get(acsKey)
  }
  return {
    series: buildSeries(medianByYear, 'USD', ACS_SOURCE_REF),
    acsMatchKey: acsKey,
  }
}

/**
 * Build a medianTaxesPaid series for a town from the fetched taxes-paid Maps.
 * The Maps are keyed by the same normalised ACS place name as medianHomeValue.
 * Source ref is ACS_TAX_SOURCE_REF (B25103) since these come from the
 * detailed table, not the DP04 profile.
 */
export function medianTaxesSeriesForTown(
  townDisplayName: string,
  stateLabel: string,
  acsYears: number[],
  taxMaps: Map<number, Map<string, number>>,
  style: AcsPlaceStyle
): { series: DataPoint[]; acsMatchKey: string } {
  const acsKey = acsKeyForTown(townDisplayName, stateLabel, style)
  const valueByYear: Record<number, number | undefined> = {}
  for (const y of acsYears) {
    const map = taxMaps.get(y)
    if (map) valueByYear[y] = map.get(acsKey)
  }
  return {
    series: buildSeries(valueByYear, 'USD', ACS_TAX_SOURCE_REF),
    acsMatchKey: acsKey,
  }
}
