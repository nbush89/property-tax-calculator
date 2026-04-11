/**
 * Search Console **Queries** exports.
 *
 * **Mode A — page column present:** each row’s `page` / `Top pages` / URL cell maps to that row’s path.
 *   Row-level page always wins. An optional `pagePathOverride` from the UI is ignored (see summary
 *   `ignoredPagePathOverride`).
 *
 * **Mode B — no page column:** typical single-page filtered export. Provide `pagePathOverride`
 *   (full URL or site path); it is validated and applied to every row.
 */

import { normalizeSitePath, pathToEntity } from './pathToEntity'
import {
  normalizeHeader,
  parseCsvLine,
  parseCtr,
  parseFloatSafe,
  parseIntSafe,
} from './searchConsoleCsvCore'

export type QueryRow = {
  query: string
  pagePath: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type ImportSearchConsoleQueriesOptions = {
  pagePathOverride?: string | null
}

export type SearchConsoleQueriesImportSummary = {
  totalRows: number
  validRows: number
  invalidRows: number
  usedPageOverride: boolean
  /** Normalized site path (lowercase, no trailing slash) when override was used */
  pageOverride?: string
  /** True when CSV had a page column but user also sent an override (override ignored) */
  ignoredPagePathOverride?: boolean
  /** Query rows whose pagePath matches a known entity route */
  matchedRows: number
  /** Valid rows that are not matched entity routes */
  unmatchedRows: number
}

const METRIC_KEYS = ['query', 'clicks', 'impressions', 'ctr', 'position'] as const

function headerToKey(h: string): string | null {
  const n = normalizeHeader(h)
  // Query dimension
  if (
    n === 'query' ||
    n === 'queries' ||
    n === 'search query' ||
    n.includes('search query') ||
    n === 'top queries' ||
    n.startsWith('top queries') ||
    (n.includes('query') && !n.includes('page') && !n.includes('queries per'))
  ) {
    return 'query'
  }
  // Page / URL dimension (per-row landing page)
  if (
    n === 'top pages' ||
    n.startsWith('top pages') ||
    n === 'page' ||
    n === 'pages' ||
    n === 'landing page' ||
    n === 'url' ||
    n === 'address' ||
    (n.includes('landing') && n.includes('page'))
  ) {
    return 'page'
  }
  if (n === 'clicks') return 'clicks'
  if (n === 'impressions') return 'impressions'
  if (n === 'ctr') return 'ctr'
  if (n === 'position' || n === 'average position' || n === 'avg. position' || n === 'avg position') {
    return 'position'
  }
  return null
}

function missingRequiredKeys(colMap: Map<string, number>): string[] {
  return METRIC_KEYS.filter(k => !colMap.has(k))
}

/**
 * Normalize and validate `pagePathOverride` when CSV has no page column.
 */
function resolvePagePathOverride(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error(
      'This CSV does not include a page column. Enter a page URL or path override for single-page Search Console exports.',
    )
  }
  const norm = normalizeSitePath(trimmed)
  if (!norm) {
    throw new Error(
      'The page path override could not be parsed as a URL or path. Use a full URL or a site path such as /new-jersey/bergen-county-property-tax/ridgewood-property-tax.',
    )
  }
  const entity = pathToEntity(norm)
  if (!entity.matched) {
    throw new Error(
      `The page path override "${norm}" could not be matched to a known site route (state, county, or town). Check spelling and slashes.`,
    )
  }
  return norm
}

/**
 * Parse Search Console Queries CSV into {@link QueryRow}s.
 *
 * @throws Error with actionable messages for missing columns, missing override when needed, or invalid override path.
 */
export function parseSearchConsoleQueriesCsv(
  csvText: string,
  options?: ImportSearchConsoleQueriesOptions,
): {
  rows: QueryRow[]
  summary: SearchConsoleQueriesImportSummary
} {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) {
    return {
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        usedPageOverride: false,
        matchedRows: 0,
        unmatchedRows: 0,
      },
    }
  }

  const headerCells = parseCsvLine(lines[0]!)
  const colMap = new Map<string, number>()
  headerCells.forEach((cell, i) => {
    const key = headerToKey(cell)
    if (key && !colMap.has(key)) colMap.set(key, i)
  })

  const missing = missingRequiredKeys(colMap)
  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s): ${missing.join(', ')}. Found headers: ${headerCells.map(h => h.trim() || '(empty)').join(', ')}. ` +
        `Queries exports need Query (or Top queries), Clicks, Impressions, CTR, Position — and usually Page unless you supply a path override.`,
    )
  }

  const hasPageColumn = colMap.has('page')
  let normalizedOverride: string | undefined
  let usedPageOverride = false
  let ignoredPagePathOverride = false

  if (hasPageColumn) {
    const ov = options?.pagePathOverride?.trim()
    if (ov) ignoredPagePathOverride = true
  } else {
    normalizedOverride = resolvePagePathOverride(String(options?.pagePathOverride ?? ''))
    usedPageOverride = true
  }

  const rows: QueryRow[] = []
  let invalidRows = 0
  const totalRows = lines.length - 1

  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]!)
    const queryRaw = cells[colMap.get('query')!]
    const clicks = parseIntSafe(cells[colMap.get('clicks')!] ?? '')
    const impressions = parseIntSafe(cells[colMap.get('impressions')!] ?? '')
    const ctr = parseCtr(cells[colMap.get('ctr')!] ?? '')
    const position = parseFloatSafe(cells[colMap.get('position')!] ?? '')

    let pagePath: string | null = null
    if (hasPageColumn) {
      const pageRaw = cells[colMap.get('page')!]
      if (!queryRaw?.trim() || !pageRaw?.trim()) {
        invalidRows++
        continue
      }
      pagePath = normalizeSitePath(pageRaw)
      if (!pagePath) {
        invalidRows++
        continue
      }
    } else {
      if (!queryRaw?.trim()) {
        invalidRows++
        continue
      }
      pagePath = normalizedOverride!
    }

    if (clicks == null || impressions == null || ctr == null || position == null) {
      invalidRows++
      continue
    }

    rows.push({
      query: queryRaw.trim(),
      pagePath,
      clicks,
      impressions,
      ctr,
      position,
    })
  }

  if (totalRows > 0 && rows.length === 0) {
    throw new Error(
      'No valid rows found after parsing. Check that each row has Query and numeric metrics, and a valid Page value (or provide a page path override if the export has no page column).',
    )
  }

  let matchedRows = 0
  for (const r of rows) {
    if (pathToEntity(r.pagePath).matched) matchedRows++
  }
  const unmatchedRows = rows.length - matchedRows

  return {
    rows,
    summary: {
      totalRows,
      validRows: rows.length,
      invalidRows,
      usedPageOverride,
      pageOverride: usedPageOverride ? normalizedOverride : undefined,
      ...(ignoredPagePathOverride ? { ignoredPagePathOverride: true } : {}),
      matchedRows,
      unmatchedRows,
    },
  }
}
