import * as https from 'node:https'
import type { DataPoint } from './state-metrics-types'
import { buildSeries } from './build-series'

export const ACS_DATASET = 'acs/acs5/profile'
export const ACS_VAR_MEDIAN_HOME_VALUE = 'DP04_0089E'
export const ACS_SOURCE_REF = 'us_census_acs_profile_dp04'

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

const CENSUS_SUPPRESSED_NUM = -666666666

export type AcsPlaceStyle = 'nj' | 'texas'

function normalizeForStyle(rawName: string, style: AcsPlaceStyle): string {
  return style === 'nj' ? normalizePlaceNameNj(rawName) : normalizePlaceNameTexasAcsKey(rawName)
}

/**
 * Census ACS5 profile: median home value for all places in a state.
 */
export async function fetchAcsMedianHomeValueMap(
  year: number,
  stateFips: string,
  style: AcsPlaceStyle
): Promise<Map<string, number>> {
  const base = `https://api.census.gov/data/${year}/${ACS_DATASET}`
  const url = `${base}?get=NAME,${ACS_VAR_MEDIAN_HOME_VALUE}&for=place:*&in=state:${stateFips}`
  const rows = (await fetchJson(url)) as string[][]
  const header = rows[0]
  const nameIdx = header.indexOf('NAME')
  const valIdx = header.indexOf(ACS_VAR_MEDIAN_HOME_VALUE)

  const out = new Map<string, number>()
  for (const r of rows.slice(1)) {
    const name = r[nameIdx]
    const val = r[valIdx]
    if (!val) continue
    const n = Number(val)
    if (!Number.isFinite(n)) continue
    if (n === CENSUS_SUPPRESSED_NUM || n < 0) continue
    out.set(normalizeForStyle(name, style), n)
  }
  return out
}

export function medianHomeSeriesForTown(
  townDisplayName: string,
  stateLabel: string,
  acsYears: number[],
  acsMaps: Map<number, Map<string, number>>,
  style: AcsPlaceStyle
): { series: DataPoint[]; acsMatchKey: string } {
  const acsKey =
    style === 'nj'
      ? normalizePlaceNameNj(`${townDisplayName}, ${stateLabel}`)
      : normalizePlaceNameTexasAcsKey(`${townDisplayName}, ${stateLabel}`)
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
