import pdfParse from 'pdf-parse'
import * as XLSX from 'xlsx'
import type { DataPoint } from '../../lib/state-metrics-types'
import { downloadBuffer, tryDownloadFirst } from '../../lib/download'
import { NJ_TIER1 } from './config'

export const NJ_MODIV_SOURCE_REF = 'nj_modiv_avg_restax'

const NJ_MODIV_USER_AGENT = 'nj-avg-tax-script/1.0'

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

function moneyToNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/\$/g, '').replace(/,/g, '').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function normalizeTownNameForMatch(name: string): string {
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
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  const moneyRe = /\$[\d,]+/
  const countyNameRe = /^([A-Z ]+ COUNTY)$/i
  const townRe = /^\d{1,2}([A-Z0-9 .&'\/-]+?)\$[\d,]+$/i

  let currentCounty: string | undefined
  let pendingCountyName: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    const countyNameMatch = countyNameRe.exec(upperLine)
    if (countyNameMatch) {
      pendingCountyName = countyNameMatch[1].trim()
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
          i++
          pendingCountyName = undefined
        }
      }
      continue
    }
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
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
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

function pushSeries(map: Record<string, DataPoint[]>, key: string, dp: DataPoint) {
  map[key] ??= []
  map[key].push(dp)
}

function sortAndTrim(series: DataPoint[]): DataPoint[] {
  return series.slice().sort((a, b) => a.year - b.year).slice(-5)
}

const XLSX_URL_TEMPLATE =
  'https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/excel/AvgTax{year}.xlsx'
const PDF_URL_CANDIDATES = (year: number) => [
  `https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/AvgTax${year}.pdf`,
  `https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/${year}AvgResTax.pdf`,
  `https://www.nj.gov/treasury/taxation/pdf/lpt/AvgResTax/${year}AvgTaxBill.pdf`,
]

export type ModivResult = {
  counties: Record<string, DataPoint[]>
  townsByTownName: Record<string, DataPoint[]>
  yearsSucceeded: number[]
  debug: { perYear: Record<number, { urlTried: string[]; rowsParsed: number }> }
}

export async function runNjModivAvgTax(
  years: number[],
  log: (msg: string) => void
): Promise<ModivResult> {
  const countiesAccum: Record<string, DataPoint[]> = {}
  const townsAccum: Record<string, DataPoint[]> = {}
  const yearsSucceeded: number[] = []
  const perYearDebug: Record<number, { urlTried: string[]; rowsParsed: number }> = {}

  const tierTownMatchTargets = NJ_TIER1.map(t => ({
    ...t,
    matchKey: normalizeTownNameForMatch(t.townName),
  }))

  for (const year of years) {
    const perYearDebugEntry = { urlTried: [] as string[], rowsParsed: 0 }
    try {
      const xlsxUrl = XLSX_URL_TEMPLATE.replace('{year}', String(year))
      let rows: ParsedRow[] | null = null
      try {
        perYearDebugEntry.urlTried.push(xlsxUrl)
        const xlsxBuf = await downloadBuffer(xlsxUrl, { userAgent: NJ_MODIV_USER_AGENT })
        rows = parseFromXlsx(xlsxBuf)
        if (rows.length === 0) rows = null
      } catch {
        /* PDF fallback */
      }
      if (!rows || rows.length === 0) {
        const pdfUrls = PDF_URL_CANDIDATES(year)
        perYearDebugEntry.urlTried.push(...pdfUrls)
        const buf = await tryDownloadFirst(pdfUrls, { userAgent: NJ_MODIV_USER_AGENT })
        const originalStdout = process.stdout.write
        const originalStderr = process.stderr.write
        process.stdout.write = function (chunk: unknown) {
          const str = String(chunk)
          if (!str.includes('Warning:') && !str.includes('TT:')) {
            return originalStdout.call(process.stdout, chunk as Buffer)
          }
          return true
        } as typeof process.stdout.write
        process.stderr.write = function (chunk: unknown) {
          const str = String(chunk)
          if (!str.includes('Warning:') && !str.includes('TT:')) {
            return originalStderr.call(process.stderr, chunk as Buffer)
          }
          return true
        } as typeof process.stderr.write
        try {
          const parsed = await pdfParse(buf)
          rows = parseFromPdfText(parsed.text || '')
        } finally {
          process.stdout.write = originalStdout
          process.stderr.write = originalStderr
        }
      }
      perYearDebugEntry.rowsParsed = rows?.length ?? 0

      for (const r of rows ?? []) {
        if (r.kind !== 'county') continue
        const slug = COUNTY_SLUGS[r.countyName ?? r.districtName]
        if (!slug) continue
        pushSeries(countiesAccum, slug, {
          year,
          value: r.avgBill,
          unit: 'USD',
          sourceRef: NJ_MODIV_SOURCE_REF,
        })
      }

      const townRows = (rows ?? []).filter(r => r.kind === 'town')
      for (const target of tierTownMatchTargets) {
        const found = townRows.find(
          tr => normalizeTownNameForMatch(tr.districtName) === target.matchKey
        )
        if (!found) continue
        pushSeries(townsAccum, target.townName, {
          year,
          value: found.avgBill,
          unit: 'USD',
          sourceRef: NJ_MODIV_SOURCE_REF,
        })
      }
      yearsSucceeded.push(year)
    } catch (e) {
      log(`[WARN] MOD IV year ${year} failed: ${String(e)}`)
    }
    perYearDebug[year] = perYearDebugEntry
  }

  for (const k of Object.keys(countiesAccum)) {
    countiesAccum[k] = sortAndTrim(countiesAccum[k])
  }
  for (const k of Object.keys(townsAccum)) {
    townsAccum[k] = sortAndTrim(townsAccum[k])
  }

  return {
    counties: countiesAccum,
    townsByTownName: townsAccum,
    yearsSucceeded,
    debug: { perYear: perYearDebug },
  }
}
