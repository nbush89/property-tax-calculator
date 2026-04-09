/**
 * Search Console "landing page" / performance CSV import.
 * Duplicate paths in a single file: last row wins (deterministic).
 */

import { normalizeSitePath, pathToEntity } from './pathToEntity'
import {
  normalizeHeader,
  parseCsvLine,
  parseCtr,
  parseFloatSafe,
  parseIntSafe,
} from './searchConsoleCsvCore'
import type { SearchPerformanceSnapshotRecord, SeoEntityType } from './types'

export type SearchConsoleImportSummary = {
  totalRows: number
  imported: number
  matched: number
  unmatched: number
  invalid: number
  unmatchedSamples: string[]
  invalidSamples: string[]
}

/** Map header cell to canonical key */
function headerToKey(h: string): string | null {
  const n = normalizeHeader(h)
  if (n.includes('query')) return null
  // Google Search Console “Pages” / “Top pages” export uses this header for the URL column
  if (
    n === 'top pages' ||
    n.startsWith('top pages:') ||
    n === 'page' ||
    n === 'landing page' ||
    n === 'url' ||
    (n.includes('landing') && n.includes('page')) ||
    /^top pages:?\s*page$/i.test(h.trim())
  ) {
    return 'page'
  }
  if (n === 'clicks') return 'clicks'
  if (n === 'impressions') return 'impressions'
  if (n === 'ctr') return 'ctr'
  if (n === 'position' || n === 'average position') return 'position'
  return null
}

export type ParsedSnapshotRow = Omit<SearchPerformanceSnapshotRecord, 'id' | 'importedAt'>

/**
 * Parse CSV text into snapshot rows. Only rows that resolve to a known entity path are returned in `rows`.
 */
export function parseSearchConsoleLandingPageCsv(csvText: string): {
  rows: ParsedSnapshotRow[]
  summary: SearchConsoleImportSummary
} {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) {
    return {
      rows: [],
      summary: {
        totalRows: 0,
        imported: 0,
        matched: 0,
        unmatched: 0,
        invalid: 0,
        unmatchedSamples: [],
        invalidSamples: [],
      },
    }
  }

  const headerCells = parseCsvLine(lines[0]!)
  const colMap = new Map<string, number>()
  headerCells.forEach((cell, i) => {
    const key = headerToKey(cell)
    if (key && !colMap.has(key)) colMap.set(key, i)
  })

  const required = ['page', 'clicks', 'impressions', 'ctr', 'position'] as const
  for (const k of required) {
    if (!colMap.has(k)) {
      throw new Error(
        `CSV missing required column "${k}". Found headers: ${headerCells.join(', ')}. For URLs use "Top pages" or "Page"; also need Clicks, Impressions, CTR, Position.`
      )
    }
  }

  const byPath = new Map<string, ParsedSnapshotRow>()
  let invalid = 0
  let unmatched = 0
  const unmatchedSamples: string[] = []
  const invalidSamples: string[] = []

  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]!)
    const pageRaw = cells[colMap.get('page')!]
    const clicks = parseIntSafe(cells[colMap.get('clicks')!] ?? '')
    const impressions = parseIntSafe(cells[colMap.get('impressions')!] ?? '')
    const ctr = parseCtr(cells[colMap.get('ctr')!] ?? '')
    const position = parseFloatSafe(cells[colMap.get('position')!] ?? '')

    if (clicks == null || impressions == null || ctr == null || position == null || !pageRaw) {
      invalid++
      if (invalidSamples.length < 15) {
        invalidSamples.push(pageRaw || `(row ${li + 1})`)
      }
      continue
    }

    const pathNorm = normalizeSitePath(pageRaw)
    if (!pathNorm) {
      invalid++
      if (invalidSamples.length < 15) invalidSamples.push(pageRaw)
      continue
    }

    const entity = pathToEntity(pathNorm)
    if (!entity.matched) {
      unmatched++
      if (unmatchedSamples.length < 20) unmatchedSamples.push(pathNorm)
      continue
    }

    const row: ParsedSnapshotRow = {
      entityType: entity.entityType as SeoEntityType,
      stateSlug: entity.stateSlug,
      countySlug: entity.countySlug,
      townSlug: entity.townSlug,
      pagePath: pathNorm,
      impressions,
      clicks,
      ctr,
      averagePosition: position,
      topQueriesJson: null,
      sourceDateStart: null,
      sourceDateEnd: null,
    }

    byPath.set(pathNorm, row)
  }

  const rows = [...byPath.values()]
  const totalRows = lines.length - 1
  return {
    rows,
    summary: {
      totalRows,
      imported: rows.length,
      matched: rows.length,
      unmatched,
      invalid,
      unmatchedSamples,
      invalidSamples,
    },
  }
}
