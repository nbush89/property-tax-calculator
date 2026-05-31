/**
 * GA DOR Property Tax Millage Rates parser (OCR-based).
 *
 * Source format: Annual consolidated PDF from Georgia Department of Revenue,
 * Local Government Services. PDF uses Type 3 embedded fonts with no ToUnicode
 * CMap — standard PDF text extraction returns garbage. Parsed via OCR.
 *
 * Pipeline:
 *   1. Rasterize PDF pages with `pdftoppm -r 200 -png`
 *   2. OCR each page with `tesseract`
 *   3. Parse text lines: county (1-2 leading tokens) + district + trailing 1-2 numeric values (M&O, Bond)
 *
 * Range validation:
 *   - M&O mills are virtually always in [0, 35]. Outliers flagged as OCR errors.
 *   - Bond mills are usually [0, 10].
 *
 * Dependencies (must be present on PATH):
 *   - pdftoppm  (poppler-utils on Linux; brew install poppler on macOS)
 *   - tesseract (tesseract-ocr; brew install tesseract on macOS)
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { execFileSync, execSync } from 'node:child_process'
import { ALL_GA_COUNTIES_UPPER, GA_DOR_MILLAGE_SOURCE_REF, GA_MILLAGE_YEAR } from './config'

/**
 * Verify the OCR pipeline binaries are installed before attempting to
 * rasterize the PDF. Without this, the user sees a cryptic ENOENT from
 * spawnSync — this surfaces a friendly install hint instead.
 */
function assertOcrBinariesPresent(): void {
  const missing: string[] = []
  for (const bin of ['pdftoppm', 'tesseract']) {
    try {
      execSync(`command -v ${bin}`, { stdio: 'pipe' })
    } catch {
      missing.push(bin)
    }
  }
  if (missing.length === 0) return
  const isMac = process.platform === 'darwin'
  const install = isMac
    ? 'brew install poppler tesseract'
    : 'sudo apt-get install -y poppler-utils tesseract-ocr'
  throw new Error(
    `GA millage parser requires ${missing.join(' and ')} on PATH. Install with:\n  ${install}`
  )
}

const M_AND_O_MAX_REASONABLE = 35.0
const BOND_MAX_REASONABLE = 10.0

/** A single parsed millage row. */
export type GaMillageRow = {
  /** Uppercase county name (e.g. "FULTON", "BEN HILL") */
  county: string
  /** Uppercase district label (e.g. "ATLANTA", "COUNTY INCORPORATED", "SCHOOL") */
  district: string
  /** Maintenance & Operations millage rate */
  mAndO: number
  /** Bond millage rate (0 if not present in row) */
  bond: number
  /** True if M&O or Bond was outside the validated range — needs manual review */
  flagged?: boolean
  flagReason?: string
}

/** Lookup: county → (district → row) */
export type GaMillageMap = Map<string, Map<string, GaMillageRow>>

/** Build a sorted set for prefix matching, longest first. */
const SORTED_COUNTIES = [...ALL_GA_COUNTIES_UPPER].sort((a, b) => b.length - a.length)

/**
 * Rasterize PDF pages to PNG at the given DPI in an ephemeral directory.
 * Returns the directory path; caller is responsible for cleanup.
 */
function rasterizePdf(pdfPath: string, dpi = 200): { dir: string; pages: string[] } {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`)
  }
  assertOcrBinariesPresent()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-millage-'))
  try {
    execFileSync('pdftoppm', ['-r', String(dpi), '-png', pdfPath, path.join(dir, 'page')], {
      stdio: 'pipe',
    })
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true })
    throw new Error(`pdftoppm failed: ${(e as Error).message}`)
  }
  const pages = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(dir, f))
  return { dir, pages }
}

/** Run tesseract on a single PNG; return the OCR text. */
function ocrPage(pngPath: string): string {
  const out = path.join(path.dirname(pngPath), path.basename(pngPath, '.png') + '_ocr')
  try {
    execFileSync('tesseract', [pngPath, out, '-l', 'eng'], { stdio: 'pipe' })
  } catch (e) {
    throw new Error(`tesseract failed on ${pngPath}: ${(e as Error).message}`)
  }
  return fs.readFileSync(out + '.txt', 'utf8')
}

/**
 * Find the county prefix on a line. Returns the county name and the remainder.
 * Handles 1- and 2-word counties by longest-prefix match against the known list.
 */
function extractCounty(line: string): { county: string; rest: string } | null {
  const upper = line.toUpperCase()
  for (const c of SORTED_COUNTIES) {
    if (upper.startsWith(c + ' ')) {
      return { county: c, rest: line.slice(c.length).trimStart() }
    }
  }
  return null
}

/**
 * Match trailing 1 or 2 decimal numbers at the end of a line.
 * Returns the numbers and the part of the line before them.
 *
 * Tesseract OCR quirks handled here:
 *   - Decimal points often misread as commas: "10,943" → 10.943
 *   - Trailing zeros sometimes misread as "]" or "}" or ")"
 *   - Millage values are bounded [0, 35] (M&O) or [0, 10] (Bond), so a 1-2
 *     digit integer part is expected — no thousands-separator ambiguity.
 *
 * A "millage number token" is /\d{1,2}[.,]\d{1,4}/.
 */
function extractTrailingNumbers(line: string): { numbers: number[]; prefix: string } | null {
  // Strip common OCR trailing artifacts (square bracket / curly brace / close-paren).
  // These typically appear when the row has only an M&O column (no Bond), and OCR
  // misreads sub-pixel noise as punctuation. Removing them lets the single-number
  // path of the regex match.
  let working = line.replace(/[\]\}\)|]+\s*$/, '')

  // Tolerate decimal-point-misread-as-comma. Capture two optional trailing tokens.
  const re = /^(.*?)\s+(\d{1,2}[.,]\d{1,4})(?:\s+(\d{1,2}[.,]\d{1,4}))?\s*$/
  const m = re.exec(working)
  if (!m) return null
  const prefix = m[1].trim()
  const a = parseFloat(m[2].replace(',', '.'))
  const b = m[3] != null ? parseFloat(m[3].replace(',', '.')) : null
  // If two numbers: first is M&O, second is Bond (per DOR layout).
  const numbers = b != null ? [a, b] : [a]
  if (numbers.some(n => !Number.isFinite(n))) return null
  return { numbers, prefix }
}

/** True if the line looks like a header/footer/title that should be skipped. */
function isNoiseLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (/^Page \d+ of \d+/i.test(t)) return true
  if (/GEORGIA DEPARTMENT OF REVENUE/i.test(t)) return true
  if (/Local Government Services/i.test(t)) return true
  if (/PTS-R\d/i.test(t)) return true
  if (/Ad Valorem Tax Digest/i.test(t)) return true
  if (/Mar \d+, \d{4}/i.test(t)) return true
  // Column header row
  if (/^County\s+District\s+M&O/i.test(t)) return true
  if (/^County\s+District/i.test(t)) return true
  return false
}

/** Parse a single OCR-extracted line into a millage row, or return null if non-data. */
export function parseLine(line: string): GaMillageRow | null {
  if (isNoiseLine(line)) return null
  const trimmed = line.trim()

  // Step 1: trailing numbers
  const tail = extractTrailingNumbers(trimmed)
  if (!tail) return null

  // Step 2: county prefix
  const head = extractCounty(tail.prefix)
  if (!head) return null

  const district = head.rest.toUpperCase().replace(/\s+/g, ' ').trim()
  if (!district) return null

  const mAndO = tail.numbers[0]
  const bond = tail.numbers.length > 1 ? tail.numbers[1] : 0

  let flagged = false
  let flagReason: string | undefined
  if (mAndO < 0 || mAndO > M_AND_O_MAX_REASONABLE) {
    flagged = true
    flagReason = `M&O ${mAndO} outside [0, ${M_AND_O_MAX_REASONABLE}]`
  } else if (bond < 0 || bond > BOND_MAX_REASONABLE) {
    flagged = true
    flagReason = `Bond ${bond} outside [0, ${BOND_MAX_REASONABLE}]`
  }

  return { county: head.county, district, mAndO, bond, flagged, flagReason }
}

/** Parse the entire OCR'd text of the DOR PDF into structured rows. */
export function parseMillageText(text: string): GaMillageRow[] {
  const lines = text.split(/\r?\n/)
  const rows: GaMillageRow[] = []
  for (const line of lines) {
    const row = parseLine(line)
    if (row) rows.push(row)
  }
  return rows
}

/** Build a county/district lookup map from a flat row list. Last write wins. */
export function buildMillageMap(rows: GaMillageRow[]): GaMillageMap {
  const map: GaMillageMap = new Map()
  for (const row of rows) {
    if (!map.has(row.county)) map.set(row.county, new Map())
    map.get(row.county)!.set(row.district, row)
  }
  return map
}

/**
 * Full pipeline: rasterize → OCR each page → parse → return rows.
 * Logs progress to stderr.
 */
export async function parseMillagePdf(
  pdfPath: string,
  opts: { log?: (m: string) => void; keepTempDir?: boolean } = {}
): Promise<GaMillageRow[]> {
  const log = opts.log ?? (() => {})
  log(`[GA millage] rasterizing PDF: ${pdfPath}`)
  const { dir, pages } = rasterizePdf(pdfPath)
  log(`[GA millage] rasterized ${pages.length} pages -> ${dir}`)

  try {
    const allRows: GaMillageRow[] = []
    for (let i = 0; i < pages.length; i++) {
      const txt = ocrPage(pages[i])
      const rows = parseMillageText(txt)
      log(`[GA millage] page ${i + 1}/${pages.length}: ${rows.length} rows parsed`)
      allRows.push(...rows)
    }
    return allRows
  } finally {
    if (!opts.keepTempDir) {
      fs.rmSync(dir, { recursive: true, force: true })
    } else {
      log(`[GA millage] temp dir kept: ${dir}`)
    }
  }
}

/**
 * Look up the total millage for a county+town (city) combination.
 * Sums the city millage + county incorporated (or unincorporated as fallback)
 * + school + state. Returns null if any component is missing.
 */
export function getTotalMillageForTown(
  map: GaMillageMap,
  countyUpper: string,
  townUpper: string
): { total: number; components: Record<string, number> } | null {
  const districts = map.get(countyUpper)
  if (!districts) return null

  const city = districts.get(townUpper)
  if (!city) return null

  const incorporated = districts.get('COUNTY INCORPORATED')
  const school = districts.get('SCHOOL')
  const state = districts.get('STATE')

  if (!incorporated || !school) return null

  const components: Record<string, number> = {
    city: city.mAndO + city.bond,
    county: incorporated.mAndO + incorporated.bond,
    school: school.mAndO + school.bond,
    state: state ? state.mAndO + state.bond : 0,
  }

  const total = Object.values(components).reduce((a, b) => a + b, 0)
  return { total, components }
}

/** Convenience: source ref + year metadata for downstream use. */
export const GA_MILLAGE_META = {
  sourceRef: GA_DOR_MILLAGE_SOURCE_REF,
  year: GA_MILLAGE_YEAR,
}
