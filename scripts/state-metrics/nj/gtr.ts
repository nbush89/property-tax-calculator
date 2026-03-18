import * as https from 'node:https'
import pdfParse from 'pdf-parse'
import type { CountyMetricsPayload, TownMetricsPayload } from '../../lib/state-metrics-types'
import { buildSeries } from '../../lib/build-series'
import {
  NJ_GTR_SOURCE_REF,
  NJ_TAXRATE_PDF_URL_TEMPLATE,
  PDF_DISTRICT_OVERRIDES,
  NJ_TIER1,
} from './config'

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'nj-tax-metrics-script/1.0' } }, res => {
        const status = res.statusCode ?? 0
        if (status < 200 || status >= 300) {
          reject(new Error(`HTTP ${status} for ${url}`))
          res.resume()
          return
        }
        const chunks: Buffer[] = []
        res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

function normalizeDistrictName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getGtrLookupKeys(townName: string): string[] {
  const normalized = normalizeDistrictName(townName)
  const keys = [normalized]
  const withTwp = normalized.replace(/\bTOWNSHIP\b/g, 'TWP').replace(/\bTOWNSHIPS\b/g, 'TWP')
  if (withTwp !== normalized) keys.push(withTwp)
  const withTwpshp = normalized.replace(/\bTOWNSHIP\b/g, 'TWNSHP')
  if (withTwpshp !== normalized) keys.push(withTwpshp)
  const noSuffix = normalized
    .replace(/\b(TWP|TWNSHP|CITY|TOWN|BORO|BOROUGH|VILLAGE|TOWNSHIP)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (noSuffix && !keys.includes(noSuffix)) keys.push(noSuffix)
  return keys
}

function parseNjEffectiveTaxRatesFromPdfText(text: string): Map<string, number> {
  const out = new Map<string, number>()
  const rowRe1 = /([A-Z][A-Z0-9 \.\-&'\/]{2,}?)(\d+\.\d+)(\d+\.\d+)/
  const rowRe2 = /([A-Z][A-Z0-9 \.\-&'\/]{2,}?)\s+(\d+\.\d+)\s+(\d+\.\d+)/
  const rowRe3 = /([A-Z][A-Z0-9 \.\-&'\/]{2,}?)[\s\t]+(\d+\.\d+)[\s\t]+(\d+\.\d+)/

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    let m = rowRe1.exec(line)
    if (!m) m = rowRe2.exec(line)
    if (!m) m = rowRe3.exec(line)
    if (!m) continue

    const district = m[1].trim()
    const effective = Number(m[3])
    if (!Number.isFinite(effective) || effective <= 0 || effective > 10) continue

    const normalized = normalizeDistrictName(district)
    out.set(normalized, effective)
    const withoutSuffix = normalized
      .replace(/\b(TWP|TWNSHP|CITY|TOWN|BORO|BOROUGH|VILLAGE)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (withoutSuffix && withoutSuffix !== normalized) {
      out.set(withoutSuffix, effective)
    }
    const normalizedSuffix = normalized.replace(/\bTWNSHP\b/g, 'TWP')
    if (normalizedSuffix !== normalized) {
      out.set(normalizedSuffix, effective)
    }
  }
  return out
}

export type CountyList = Array<{ slug: string; towns?: Array<{ name: string; slug: string }> }>

export async function fetchGtrMapsForYears(
  gtrYears: number[],
  log: (msg: string) => void
): Promise<Map<number, Map<string, number>>> {
  const gtrMaps = new Map<number, Map<string, number>>()
  for (const y of gtrYears) {
    const url = NJ_TAXRATE_PDF_URL_TEMPLATE.replace('{year}', String(y))
    try {
      const pdfBuf = await downloadBuffer(url)
      const parsed = await pdfParse(pdfBuf)
      const map = parseNjEffectiveTaxRatesFromPdfText(parsed.text || '')
      gtrMaps.set(y, map)
      log(`[OK] NJ GTR ${y}: ${map.size} districts parsed`)
    } catch (e) {
      log(`[WARN] NJ GTR ${y} failed: ${String(e)}`)
    }
  }
  return gtrMaps
}

export function buildCountyEffectiveFromGtr(
  countiesList: CountyList,
  gtrYears: number[],
  gtrMaps: Map<number, Map<string, number>>
): Record<string, CountyMetricsPayload> {
  const countyOut: Record<string, CountyMetricsPayload> = {}
  for (const county of countiesList) {
    const countySlug = county.slug
    const townsInCounty = county.towns ?? []
    const effByYear: Record<number, number[]> = {}
    for (const y of gtrYears) {
      const gtrMap = gtrMaps.get(y)
      if (!gtrMap) continue
      const rates: number[] = []
      for (const town of townsInCounty) {
        const townName = town.name
        for (const key of getGtrLookupKeys(townName)) {
          const rate = gtrMap.get(key)
          if (rate != null && Number.isFinite(rate)) {
            rates.push(rate)
            break
          }
        }
      }
      if (rates.length > 0) {
        effByYear[y] = [rates.reduce((a, b) => a + b, 0) / rates.length]
      }
    }
    const yearToValue: Record<number, number | undefined> = {}
    for (const [y, arr] of Object.entries(effByYear)) {
      if (arr.length > 0) yearToValue[Number(y)] = arr[0]
    }
    const series = buildSeries(yearToValue, 'PERCENT', NJ_GTR_SOURCE_REF)
    if (series.length > 0) {
      countyOut[countySlug] = { metrics: { effectiveTaxRate: series } }
    }
  }
  return countyOut
}

export function mergeTownEffectiveFromGtr(
  townsOut: Record<string, TownMetricsPayload>,
  gtrYears: number[],
  gtrMaps: Map<number, Map<string, number>>,
  log: (msg: string) => void
): void {
  for (const { townName } of NJ_TIER1) {
    const pdfDistrict = (PDF_DISTRICT_OVERRIDES[townName] ?? townName).toUpperCase()
    const pdfKey = normalizeDistrictName(pdfDistrict)
    const pdfKeyNoSuffix = pdfKey
      .replace(/\b(TWP|TWNSHP|CITY|TOWN|BORO|BOROUGH|VILLAGE)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const effByYear: Record<number, number | undefined> = {}
    for (const y of gtrYears) {
      const gtrMap = gtrMaps.get(y)
      if (!gtrMap) continue
      const pdfKeyNormalized = pdfKey.replace(/\bTWNSHP\b/g, 'TWP')
      effByYear[y] =
        gtrMap.get(pdfKey) ??
        gtrMap.get(pdfKeyNormalized) ??
        gtrMap.get(pdfKeyNoSuffix) ??
        undefined
    }
    const effSeries = buildSeries(effByYear, 'PERCENT', NJ_GTR_SOURCE_REF)
    const t = (townsOut[townName] ??= {})
    t.effectiveTaxRate = effSeries
    t.debug = { ...t.debug, pdfDistrict, pdfMatchKey: pdfKey }
    log(`[INFO] ${townName} latest effective tax year: ${effSeries.at(-1)?.year ?? 'none'}`)
    if (effSeries.length === 0) {
      log(`[MISSING] effectiveTaxRate for ${townName} (PDF key: ${pdfKey})`)
    }
  }
}
