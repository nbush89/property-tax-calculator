/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import pdfParse from 'pdf-parse'
import * as XLSX from 'xlsx'

/**
 * NJ AvgResTax reports contain:
 * - Municipality rows (district name + avg bill)
 * - County summary rows (e.g., "BERGEN COUNTY $12,287")
 *
 * We extract:
 * - County averages for ALL 21 counties
 * - Town averages for your Tier-1 towns (or configure list)
 */

type Unit = 'USD'
type DataPoint = { year: number; value: number; unit: Unit; sourceRef: string }

type Output = {
  meta: {
    yearsRequested: number[]
    yearsSucceeded: number[]
    sourceRef: string
    generatedAt: string
  }
  counties: Record<string, DataPoint[]> // countySlug -> series
  towns: Record<string, DataPoint[]> // "countySlug/townSlug" -> series
  debug: {
    perYear: Record<number, { urlTried: string[]; rowsParsed: number }>
    unmatchedTowns: Record<number, string[]>
  }
}

// ----- CONFIG -----

// Choose 5 years prior (+ latest available). You can adjust these.
const YEARS = [2020, 2021, 2022, 2023, 2024]

// For 2022 NJ provides an official XLSX; prefer XLSX when available.
const XLSX_URL_TEMPLATE =
  'https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/excel/AvgTax{year}.xlsx'

// PDF naming varies by year; we try multiple patterns.
const PDF_URL_CANDIDATES = (year: number) => [
  `https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax${year}.pdf`,
  `https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/${year}AvgResTax.pdf`,
  `https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/${year}AvgTaxBill.pdf`, // just-in-case fallback
]

// Must match your state's sources map key in new-jersey.json (nj_modiv_avg_restax)
const SOURCE_REF = 'nj_modiv_avg_restax'

// Towns to extract from MOD IV report: Tier-1 + next 10 towns (countySlug/townSlug match routing)
const TIER1: Array<{ countySlug: string; townSlug: string; townName: string }> = [
  { countySlug: 'essex', townSlug: 'montclair', townName: 'Montclair' },
  { countySlug: 'hudson', townSlug: 'hoboken', townName: 'Hoboken' },
  { countySlug: 'mercer', townSlug: 'princeton', townName: 'Princeton' },
  { countySlug: 'bergen', townSlug: 'ridgewood', townName: 'Ridgewood' },
  { countySlug: 'bergen', townSlug: 'paramus', townName: 'Paramus' },
  { countySlug: 'union', townSlug: 'summit', townName: 'Summit' },
  { countySlug: 'union', townSlug: 'westfield', townName: 'Westfield' },
  { countySlug: 'morris', townSlug: 'morristown', townName: 'Morristown' },
  { countySlug: 'middlesex', townSlug: 'edison', townName: 'Edison' },
  { countySlug: 'camden', townSlug: 'cherry-hill', townName: 'Cherry Hill' },
  // Next 10 towns (add to JSON with slug; merge script will fill metrics)
  { countySlug: 'essex', townSlug: 'newark', townName: 'Newark' },
  { countySlug: 'hudson', townSlug: 'jersey-city', townName: 'Jersey City' },
  { countySlug: 'passaic', townSlug: 'paterson', townName: 'Paterson' },
  { countySlug: 'union', townSlug: 'elizabeth', townName: 'Elizabeth' },
  { countySlug: 'middlesex', townSlug: 'woodbridge', townName: 'Woodbridge' },
  { countySlug: 'ocean', townSlug: 'toms-river', townName: 'Toms River' },
  { countySlug: 'mercer', townSlug: 'hamilton', townName: 'Hamilton' },
  { countySlug: 'mercer', townSlug: 'trenton', townName: 'Trenton' },
  { countySlug: 'camden', townSlug: 'camden', townName: 'Camden' },
]

// County slug normalization for NJ county names
const COUNTY_SLUGS: Record<string, string> = {
  'ATLANTIC COUNTY': 'atlantic',
  'BERGEN COUNTY': 'bergen',
  'BURLINGTON COUNTY': 'burlington',
  'CAMDEN COUNTY': 'camden',
  'CAPE MAY COUNTY': 'cape-may',
  'CUMBERLAND COUNTY': 'cumberland',
  'ESSEX COUNTY': 'essex',
  'GLOUCESTER COUNTY': 'gloucester',
  'HUDSON COUNTY': 'hudson',
  'HUNTERDON COUNTY': 'hunterdon',
  'MERCER COUNTY': 'mercer',
  'MIDDLESEX COUNTY': 'middlesex',
  'MONMOUTH COUNTY': 'monmouth',
  'MORRIS COUNTY': 'morris',
  'OCEAN COUNTY': 'ocean',
  'PASSAIC COUNTY': 'passaic',
  'SALEM COUNTY': 'salem',
  'SOMERSET COUNTY': 'somerset',
  'SUSSEX COUNTY': 'sussex',
  'UNION COUNTY': 'union',
  'WARREN COUNTY': 'warren',
}

// ----- HTTP helpers -----

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'nj-avg-tax-script/1.0' } }, res => {
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

async function tryDownloadFirst(urls: string[]): Promise<{ url: string; buf: Buffer }> {
  const tried: string[] = []
  for (const u of urls) {
    tried.push(u)
    try {
      const buf = await downloadBuffer(u)
      return { url: u, buf }
    } catch {
      // continue
    }
  }
  throw new Error(`All download attempts failed:\n${tried.join('\n')}`)
}

// ----- parsing helpers -----

function moneyToNumber(raw: string): number | undefined {
  // "$12,287" -> 12287
  const cleaned = raw.replace(/\$/g, '').replace(/,/g, '').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function normalizeTownNameForMatch(name: string): string {
  // Report uses suffixes (BORO, TWP, CITY, etc). We strip suffixes for matching.
  const up = name.toUpperCase().trim()
  return up
    .replace(/\b(CITY|TOWN|TWP|TOWNSHIP|BORO|BOROUGH|VILLAGE)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type ParsedRow = {
  kind: 'county' | 'town'
  countyName?: string
  districtName: string
  avgBill: number
}

function parseFromPdfText(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []

  // Actual format from PDF:
  // County: "ATLANTIC COUNTY" on one line, "$6,799" on next line
  // Town: "01ABSECON CITY$5,731" (no spaces between code/name/amount)
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  const moneyRe = /\$[\d,]+/
  const countyNameRe = /^([A-Z ]+ COUNTY)$/i
  const townRe = /^\d{1,2}([A-Z0-9 .&'\/-]+?)\$[\d,]+$/i // Format: "01ABSECON CITY$5,731"

  let currentCounty: string | undefined
  let pendingCountyName: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()

    // Check if this is a county name line (followed by amount on next line)
    const countyNameMatch = countyNameRe.exec(upperLine)
    if (countyNameMatch) {
      pendingCountyName = countyNameMatch[1].trim()
      // Check next line for amount
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        const amt = moneyRe.exec(nextLine)?.[0]
        const avg = amt ? moneyToNumber(amt) : undefined
        if (avg != null && pendingCountyName) {
          currentCounty = pendingCountyName
          rows.push({
            kind: 'county',
            countyName: pendingCountyName,
            districtName: pendingCountyName,
            avgBill: avg,
          })
          i++ // Skip the amount line
          pendingCountyName = undefined
        }
      }
      continue
    }

    // Check if this is a town line (format: "01ABSECON CITY$5,731")
    const townMatch = townRe.exec(upperLine)
    if (townMatch) {
      const districtName = townMatch[1].trim()
      const amt = moneyRe.exec(line)?.[0]
      const avg = amt ? moneyToNumber(amt) : undefined
      if (avg != null) {
        rows.push({
          kind: 'town',
          countyName: currentCounty,
          districtName,
          avgBill: avg,
        })
      }
    }
  }

  return rows
}

function parseFromXlsx(buf: Buffer): ParsedRow[] {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

  // The XLSX files typically contain:
  // District Code | District Name | Average Tax Bill
  // County rows exist with District Name ending "COUNTY"
  // Municipality rows exist with District Name containing suffixes
  const rows: ParsedRow[] = []
  let currentCounty: string | undefined

  for (const r of json) {
    const nameRaw = String(r['District Name'] ?? r['DISTRICT NAME'] ?? '').trim()
    const billRaw = String(r['Average Tax Bill'] ?? r['AVERAGE TAX BILL'] ?? '').trim()

    if (!nameRaw || !billRaw) continue

    const name = nameRaw.toUpperCase()
    const avg = moneyToNumber(billRaw.startsWith('$') ? billRaw : `$${billRaw}`)
    if (avg == null) continue

    if (name.endsWith(' COUNTY')) {
      currentCounty = name
      rows.push({ kind: 'county', countyName: name, districtName: name, avgBill: avg })
    } else {
      rows.push({ kind: 'town', countyName: currentCounty, districtName: name, avgBill: avg })
    }
  }

  return rows
}

// ----- series builder -----

function pushSeries(map: Record<string, DataPoint[]>, key: string, dp: DataPoint) {
  map[key] ||= []
  map[key].push(dp)
}

function sortAndTrim(series: DataPoint[]): DataPoint[] {
  const sorted = series.slice().sort((a, b) => a.year - b.year)
  return sorted.slice(-5)
}

// ----- main -----

async function main() {
  const out: Output = {
    meta: {
      yearsRequested: YEARS,
      yearsSucceeded: [],
      sourceRef: SOURCE_REF,
      generatedAt: new Date().toISOString(),
    },
    counties: {},
    towns: {},
    debug: { perYear: {}, unmatchedTowns: {} },
  }

  const tierTownMatchTargets = TIER1.map(t => ({
    ...t,
    matchKey: normalizeTownNameForMatch(t.townName),
  }))

  for (const year of YEARS) {
    const perYearDebug = { urlTried: [] as string[], rowsParsed: 0 }
    const unmatchedThisYear: string[] = []

    try {
      // 1) Prefer XLSX when available (often exists for some years like 2022/2024/2020)
      const xlsxUrl = XLSX_URL_TEMPLATE.replace('{year}', String(year))
      let rows: ParsedRow[] | null = null

      try {
        perYearDebug.urlTried.push(xlsxUrl)
        const xlsxBuf = await downloadBuffer(xlsxUrl)
        rows = parseFromXlsx(xlsxBuf)
        // If XLSX parsing returned 0 rows, fall back to PDF
        if (rows.length === 0) {
          rows = null
        }
      } catch {
        // XLSX download/parse failed, will try PDF
      }

      // 2) Fall back to PDFs if XLSX didn't work or returned 0 rows
      if (!rows || rows.length === 0) {
        const pdfUrls = PDF_URL_CANDIDATES(year)
        perYearDebug.urlTried.push(...pdfUrls)
        const { buf } = await tryDownloadFirst(pdfUrls)
        // Suppress pdf-parse warnings by temporarily overriding console methods
        const originalStdout = process.stdout.write
        const originalStderr = process.stderr.write
        let suppressedOutput = ''
        process.stdout.write = function (chunk: any) {
          const str = String(chunk)
          if (!str.includes('Warning:') && !str.includes('TT:')) {
            return originalStdout.call(process.stdout, chunk)
          }
          suppressedOutput += str
          return true
        } as any
        process.stderr.write = function (chunk: any) {
          const str = String(chunk)
          if (!str.includes('Warning:') && !str.includes('TT:')) {
            return originalStderr.call(process.stderr, chunk)
          }
          suppressedOutput += str
          return true
        } as any
        try {
          const parsed = await pdfParse(buf)
          rows = parseFromPdfText(parsed.text || '')
        } finally {
          // Restore original write methods
          process.stdout.write = originalStdout
          process.stderr.write = originalStderr
        }
      }

      perYearDebug.rowsParsed = rows.length

      // Build county series for all counties found
      for (const r of rows) {
        if (r.kind !== 'county') continue
        const slug = COUNTY_SLUGS[r.countyName ?? r.districtName]
        if (!slug) continue
        pushSeries(out.counties, slug, {
          year,
          value: r.avgBill,
          unit: 'USD',
          sourceRef: SOURCE_REF,
        })
      }

      // Build town series for Tier-1 only (to keep output small + focused)
      // Match by normalized names (strip BORO/TWP/CITY, etc).
      const townRows = rows.filter(r => r.kind === 'town')

      for (const target of tierTownMatchTargets) {
        const found = townRows.find(
          tr => normalizeTownNameForMatch(tr.districtName) === target.matchKey
        )
        if (!found) {
          unmatchedThisYear.push(target.townName)
          continue
        }
        const key = `${target.countySlug}/${target.townSlug}`
        pushSeries(out.towns, key, {
          year,
          value: found.avgBill,
          unit: 'USD',
          sourceRef: SOURCE_REF,
        })
      }

      out.meta.yearsSucceeded.push(year)
    } catch (e) {
      // log to stderr, but keep stdout clean if you redirect
      console.error(`[WARN] Year ${year} failed: ${String(e)}`)
    }

    out.debug.perYear[year] = perYearDebug
    out.debug.unmatchedTowns[year] = unmatchedThisYear
  }

  // Sort/trim to last 5 per series
  for (const k of Object.keys(out.counties)) out.counties[k] = sortAndTrim(out.counties[k])
  for (const k of Object.keys(out.towns)) out.towns[k] = sortAndTrim(out.towns[k])

  process.stdout.write(JSON.stringify(out, null, 2))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
