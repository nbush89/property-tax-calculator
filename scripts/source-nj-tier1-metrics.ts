/* eslint-disable no-console */
import * as https from 'node:https'
// @ts-ignore - pdf-parse types may not be perfect, but it works at runtime
import pdfParse from 'pdf-parse'
import { buildRecentYears } from './utils/buildRecentYears'

type Unit = 'USD' | 'PERCENT'

type DataPoint = {
  year: number
  value: number
  unit: Unit
  sourceRef: string
}

type TownMetricsOut = {
  medianHomeValue: DataPoint[]
  effectiveTaxRate: DataPoint[]
  debug: {
    acsMatchKey: string
    pdfDistrict: string
    pdfMatchKey: string
  }
}

const STATE_FIPS_NJ = '34'
const ACS_DATASET = 'acs/acs5/profile'
const ACS_VAR_MEDIAN_HOME_VALUE = 'DP04_0089E' // Owner-occupied units: Median value (dollars)

// NJ Division of Taxation "General & Effective Tax Rates" PDFs
const NJ_TAXRATE_PDF_URL_TEMPLATE =
  'https://www.nj.gov/treasury/taxation/pdf/lpt/gtr/{year}taxrates.pdf'

const TIER1_TOWNS = [
  'Montclair',
  'Hoboken',
  'Princeton',
  'Ridgewood',
  'Paramus',
  'Summit',
  'Westfield',
  'Morristown',
  'Edison',
  'Cherry Hill',
  // Next 10 (same as source-nj-avg-tax-bill TIER1)
  'Newark',
  'Jersey City',
  'Paterson',
  'Elizabeth',
  'Woodbridge',
  'Toms River',
  'Hamilton',
  'Trenton',
  'Camden',
  // Next 10 (same as source-nj-avg-tax-bill TIER1)
  'Lakewood Township',
  'Middletown Township',
  'Old Bridge Township',
  'East Brunswick',
  'Franklin Township',
  'Bridgewater Township',
  'Wayne Township',
  'East Orange',
  'Bayonne',
  'Piscataway',
] as const

const PDF_DISTRICT_OVERRIDES: Record<string, string> = {
  Montclair: 'MONTCLAIR TWP',
  Hoboken: 'HOBOKEN CITY',
  Princeton: 'PRINCETON',
  Ridgewood: 'RIDGEWOOD VILLAGE',
  Paramus: 'PARAMUS BORO',
  Summit: 'SUMMIT CITY',
  Westfield: 'WESTFIELD TOWN',
  Morristown: 'MORRISTOWN TOWN',
  Edison: 'EDISON TWP',
  'Cherry Hill': 'CHERRY HILL TWNSHP',
  Newark: 'NEWARK CITY',
  'Jersey City': 'JERSEY CITY',
  Paterson: 'PATERSON CITY',
  Elizabeth: 'ELIZABETH CITY',
  Woodbridge: 'WOODBRIDGE TWP',
  'Toms River': 'TOMS RIVER TWP',
  Hamilton: 'HAMILTON TWP',
  Trenton: 'TRENTON CITY',
  Camden: 'CAMDEN CITY',
  'Lakewood Township': 'LAKEWOOD TWP',
  'Middletown Township': 'MIDDLETOWN TWP',
  'Old Bridge Township': 'OLD BRIDGE TWP',
  'East Brunswick': 'EAST BRUNSWICK TWP',
  'Franklin Township': 'FRANKLIN TWP',
  'Bridgewater Township': 'BRIDGEWATER TWP',
  'Wayne Township': 'WAYNE TWP',
  'East Orange': 'EAST ORANGE CITY',
  Bayonne: 'BAYONNE CITY',
  Piscataway: 'PISCATAWAY TWP',
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'nj-tax-metrics-script/1.0' } }, res => {
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

function normalizePlaceName(raw: string): string {
  // "Hoboken city, New Jersey" -> "HOBOKEN"
  const primary = raw.split(',')[0]?.trim().toUpperCase() ?? raw.toUpperCase()
  return primary
    .replace(/\b(CITY|TOWN|TOWNSHIP|TWP|BOROUGH|BORO|VILLAGE)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDistrictName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchAcsMedianHomeValueMap(year: number): Promise<Map<string, number>> {
  const base = `https://api.census.gov/data/${year}/${ACS_DATASET}`
  const url = `${base}?get=NAME,${ACS_VAR_MEDIAN_HOME_VALUE}&for=place:*&in=state:${STATE_FIPS_NJ}`
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
    out.set(normalizePlaceName(name), n)
  }
  return out
}

function parseNjEffectiveTaxRatesFromPdfText(text: string): Map<string, number> {
  const out = new Map<string, number>()

  // Heuristic row match: DISTRICT  <generalRate> <effectiveRate>
  // PDF text extraction format: "ABSECON CITY3.2963.256" (NO space between name and numbers!)
  // Pattern 1: District name immediately followed by two decimal numbers (no space)
  // This is the actual format from the PDF: "DISTRICT_NAME3.2963.256"
  const rowRe1 = /([A-Z][A-Z0-9 \.\-&'\/]{2,}?)(\d+\.\d+)(\d+\.\d+)/
  // Pattern 2: District name with space before numbers (fallback for other formats)
  const rowRe2 = /([A-Z][A-Z0-9 \.\-&'\/]{2,}?)\s+(\d+\.\d+)\s+(\d+\.\d+)/
  // Pattern 3: More flexible whitespace (tabs, multiple spaces)
  const rowRe3 = /([A-Z][A-Z0-9 \.\-&'\/]{2,}?)[\s\t]+(\d+\.\d+)[\s\t]+(\d+\.\d+)/

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  let matchedCount = 0
  for (const line of lines) {
    // Try each pattern in order
    let m = rowRe1.exec(line)
    if (!m) m = rowRe2.exec(line)
    if (!m) m = rowRe3.exec(line)
    if (!m) continue

    const district = m[1].trim()
    const effective = Number(m[3])
    if (!Number.isFinite(effective) || effective <= 0 || effective > 10) {
      // Sanity check: effective tax rates should be between 0 and 10%
      continue
    }

    matchedCount++

    // Store the normalized key
    const normalized = normalizeDistrictName(district)
    out.set(normalized, effective)

    // Also store variations for better matching:
    // 1. Without common suffixes
    const withoutSuffix = normalized
      .replace(/\b(TWP|TWNSHP|CITY|TOWN|BORO|BOROUGH|VILLAGE)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (withoutSuffix && withoutSuffix !== normalized) {
      out.set(withoutSuffix, effective)
    }

    // 2. Normalize TWNSHP -> TWP for matching
    const normalizedSuffix = normalized.replace(/\bTWNSHP\b/g, 'TWP')
    if (normalizedSuffix !== normalized) {
      out.set(normalizedSuffix, effective)
    }
  }

  return out
}

function buildSeries(
  yearToValue: Record<number, number | undefined>,
  unit: Unit,
  sourceRef: string
): DataPoint[] {
  const years = Object.keys(yearToValue)
    .map(y => Number(y))
    .filter(y => Number.isFinite(y))
    .sort((a, b) => a - b)

  const series: DataPoint[] = []
  for (const year of years) {
    const v = yearToValue[year]
    if (v == null) continue
    series.push({ year, value: v, unit, sourceRef })
  }
  // Keep last 5
  return series.slice(-5)
}

const CURRENT_YEAR = new Date().getFullYear()

// Look back far enough to always keep 5 valid years even if the newest fails
const GTR_YEARS = buildRecentYears({
  endYear: CURRENT_YEAR - 1,
  window: 6,
})

const ACS_YEARS = buildRecentYears({
  endYear: CURRENT_YEAR - 2,
  window: 6,
})

async function main() {
  const ACS_SOURCE_REF = 'us_census_acs_profile_dp04'
  const NJ_GTR_SOURCE_REF = 'nj_div_taxation_general_effective_tax_rates'

  // 1) ACS maps per year
  const acsMaps = new Map<number, Map<string, number>>()
  for (const y of ACS_YEARS) {
    try {
      const map = await fetchAcsMedianHomeValueMap(y)
      acsMaps.set(y, map)
      console.error(`[OK] ACS ${y}: ${map.size} NJ places`)
    } catch (e) {
      console.error(`[WARN] ACS ${y} failed:`, e)
      acsMaps.set(y, new Map())
    }
  }

  // 2) NJ effective tax rate maps per year
  const gtrMaps = new Map<number, Map<string, number>>()
  for (const y of GTR_YEARS) {
    const url = NJ_TAXRATE_PDF_URL_TEMPLATE.replace('{year}', String(y))
    try {
      const pdfBuf = await downloadBuffer(url)
      const parsed = await pdfParse(pdfBuf)
      const pdfText = parsed.text || ''
      const map = parseNjEffectiveTaxRatesFromPdfText(pdfText)
      gtrMaps.set(y, map)
      console.error(`[OK] NJ GTR ${y}: ${map.size} districts parsed`)
    } catch (e) {
      console.error(`[WARN] NJ GTR ${y} failed:`, e)
      continue
    }
  }

  // 3) Build town outputs
  const out: Record<string, TownMetricsOut> = {}

  for (const town of TIER1_TOWNS) {
    const acsKey = normalizePlaceName(`${town}, New Jersey`) // token match
    const pdfDistrict = (PDF_DISTRICT_OVERRIDES[town] ?? town).toUpperCase()
    const pdfKey = normalizeDistrictName(pdfDistrict)
    // Also try without suffix for matching
    const pdfKeyNoSuffix = pdfKey
      .replace(/\b(TWP|TWNSHP|CITY|TOWN|BORO|BOROUGH|VILLAGE)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const medianByYear: Record<number, number | undefined> = {}
    const effByYear: Record<number, number | undefined> = {}

    // Fetch median home values from ACS years
    // Each year is processed independently - if one year fails, others still work
    for (const y of ACS_YEARS) {
      const acsMap = acsMaps.get(y)
      if (acsMap) {
        medianByYear[y] = acsMap.get(acsKey)
      }
      // If acsMap is missing or doesn't have the key, medianByYear[y] stays undefined
      // buildSeries will skip undefined values, so other years are unaffected
    }

    // Fetch effective tax rates from GTR years
    // Each year is processed independently - if one year fails, others still work
    for (const y of GTR_YEARS) {
      const gtrMap = gtrMaps.get(y)
      if (!gtrMap) {
        // This year's PDF fetch failed - skip it, other years will still be processed
        continue
      }

      // Try multiple matching strategies:
      // 1. Exact normalized match
      // 2. Match without suffix
      // 3. Try with TWNSHP normalized to TWP (or vice versa)
      const pdfKeyNormalized = pdfKey.replace(/\bTWNSHP\b/g, 'TWP')
      effByYear[y] =
        gtrMap.get(pdfKey) ??
        gtrMap.get(pdfKeyNormalized) ??
        gtrMap.get(pdfKeyNoSuffix) ??
        undefined
    }

    const medianSeries = buildSeries(medianByYear, 'USD', ACS_SOURCE_REF)
    const effSeries = buildSeries(effByYear, 'PERCENT', NJ_GTR_SOURCE_REF)

    const latestEffYear = effSeries.at(-1)?.year
    console.error(`[INFO] ${town} latest effective tax year: ${latestEffYear ?? 'none'}`)

    if (medianSeries.length === 0) {
      console.error(`[MISSING] medianHomeValue for ${town} (ACS key: ${acsKey})`)
    }
    if (effSeries.length === 0) {
      console.error(
        `[MISSING] effectiveTaxRate for ${town} (PDF key: ${pdfKey}, name: ${pdfDistrict})`
      )
    }

    out[town] = {
      medianHomeValue: medianSeries,
      effectiveTaxRate: effSeries,
      debug: { acsMatchKey: acsKey, pdfDistrict, pdfMatchKey: pdfKey },
    }
  }

  process.stdout.write(JSON.stringify(out, null, 2))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
