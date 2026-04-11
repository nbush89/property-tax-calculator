/**
 * Download and parse Texas Comptroller Tax Rates and Levies XLSX workbooks.
 * Column detection is header-row based (first ~25 rows) to survive title rows.
 */
import * as XLSX from 'xlsx'
import { downloadBuffer as _downloadBuffer } from '../../lib/download'
import { normalizeTexasCountyKey } from './normalize'

const TX_USER_AGENT = 'state-metrics-texas-rates/1.0'

/**
 * Re-export so existing callers (rates.ts) can import from here without
 * changing their import path, while the implementation lives in one place.
 */
export function downloadBuffer(url: string): Promise<Buffer> {
  return _downloadBuffer(url, { userAgent: TX_USER_AGENT })
}

function sheetToAoA(ws: XLSX.WorkSheet): string[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
}

function normalizeHeaderCell(c: unknown): string {
  return String(c ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

export type CountyRateRow = { countyName: string; totalRate: number }
export type CityRateRow = { countyName: string; unitName: string; totalRate: number }

function findCountyHeaderRow(aoa: string[][]): number {
  for (let i = 0; i < Math.min(30, aoa.length); i++) {
    const row = aoa[i].map(normalizeHeaderCell)
    const hasCounty = row.some(c => c === 'COUNTY NAME')
    const hasTotalCounty = row.some(
      c => c.includes('TOTAL') && c.includes('COUNTY') && c.includes('TAX') && c.includes('RATE')
    )
    if (hasCounty && hasTotalCounty) return i
  }
  throw new Error('County workbook: could not find header row with COUNTY NAME and TOTAL COUNTY TAX RATE')
}

function findCityHeaderRow(aoa: string[][]): number {
  for (let i = 0; i < Math.min(30, aoa.length); i++) {
    const row = aoa[i].map(normalizeHeaderCell)
    const hasUnit = row.some(c => c === 'TAXING UNIT NAME')
    const hasTotal = row.some(c => c === 'TOTAL TAX RATE' || (c.includes('TOTAL') && c.includes('TAX RATE')))
    if (hasUnit && hasTotal) return i
  }
  throw new Error('City workbook: could not find header row with TAXING UNIT NAME and TOTAL TAX RATE')
}

function rowObject(headers: string[], row: unknown[]): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  headers.forEach((h, j) => {
    if (h) o[h] = row[j]
  })
  return o
}

function parseRate(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

export function parseCountyRatesWorkbook(buf: Buffer): CountyRateRow[] {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('County workbook: no sheet')
  const aoa = sheetToAoA(ws)
  const hr = findCountyHeaderRow(aoa)
  const headers = aoa[hr].map(h => String(h ?? '').trim())
  const idxCounty = headers.findIndex(h => normalizeHeaderCell(h) === 'COUNTY NAME')
  const idxTotal = headers.findIndex(
    h => normalizeHeaderCell(h).replace(/\s+/g, ' ') === 'TOTAL COUNTY TAX RATE'
  )
  if (idxCounty < 0 || idxTotal < 0) {
    throw new Error('County workbook: missing COUNTY NAME or TOTAL COUNTY TAX RATE column')
  }
  const out: CountyRateRow[] = []
  const seen = new Set<string>()
  for (let i = hr + 1; i < aoa.length; i++) {
    const row = aoa[i]
    const name = String(row[idxCounty] ?? '').trim()
    if (!name || /^total$/i.test(name)) continue
    const rate = parseRate(row[idxTotal])
    if (rate == null) continue
    const key = normalizeTexasCountyKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ countyName: name, totalRate: rate })
  }
  return out
}

export function parseCityRatesWorkbook(buf: Buffer): CityRateRow[] {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets.Detail ?? wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('City workbook: no sheet')
  const aoa = sheetToAoA(ws)
  const hr = findCityHeaderRow(aoa)
  const headers = aoa[hr].map(h => String(h ?? '').trim())
  const idxCounty = headers.findIndex(h => normalizeHeaderCell(h) === 'COUNTY NAME')
  const idxUnit = headers.findIndex(h => normalizeHeaderCell(h) === 'TAXING UNIT NAME')
  const idxTotal = headers.findIndex(h => normalizeHeaderCell(h) === 'TOTAL TAX RATE')
  if (idxCounty < 0 || idxUnit < 0 || idxTotal < 0) {
    throw new Error('City workbook: missing COUNTY NAME, TAXING UNIT NAME, or TOTAL TAX RATE')
  }
  const out: CityRateRow[] = []
  for (let i = hr + 1; i < aoa.length; i++) {
    const row = aoa[i]
    const countyName = String(row[idxCounty] ?? '').trim()
    const unitName = String(row[idxUnit] ?? '').trim()
    if (!countyName || !unitName) continue
    const rate = parseRate(row[idxTotal])
    if (rate == null) continue
    out.push({ countyName, unitName, totalRate: rate })
  }
  return out
}
