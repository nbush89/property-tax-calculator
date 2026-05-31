/**
 * Georgia state metrics sourcing config.
 *
 * Two source pipelines for GA:
 *   1. ACS (shared with NJ/TX) — median home value, median taxes paid, county effective rate.
 *   2. GA DOR consolidated millage PDF — per-jurisdiction M&O + Bond millage rates.
 *
 * The GA DOR PDF uses Type 3 embedded fonts with no ToUnicode CMap, so standard PDF text
 * extraction returns garbage. Parsed via OCR (pdftoppm → tesseract). See millage.ts.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Source reference key matching data/states/georgia.json sources map. */
export const GA_DOR_MILLAGE_SOURCE_REF = 'ga_dor_millage_rates'

/** ACS B25103 — median real estate taxes paid; reused from common ACS sourcing. */
export const GA_ACS_TAXES_SOURCE_REF = 'us_census_acs_b25103'

/** ACS DP04_0089E — median home value; reused from common ACS sourcing. */
export const GA_ACS_HOME_VALUE_SOURCE_REF = 'us_census_acs_profile_dp04'

/** Most recent year of GA DOR millage data we publish/source. */
export const GA_MILLAGE_YEAR = 2025

export type GaTownTarget = {
  countySlug: string
  townSlug: string
  /** Display name from state JSON (e.g. "Sandy Springs") */
  townName: string
  /** GA DOR district label to match in the OCR'd PDF (uppercased, no suffix normalization). */
  pdfDistrictName?: string
  /**
   * For cities with an independent school district (Atlanta, Decatur, Marietta, etc.),
   * this is the DOR PDF label for that district (e.g. "IND SCHOOL ATLANTA"). When set,
   * the merge step uses this row's mills as the city's school component instead of the
   * county-wide SCHOOL row. Leave undefined for cities that use county school millage.
   *
   * Why this matters: City of Atlanta residents pay Atlanta Public Schools millage
   * (~21.6 mills), not Fulton County Schools (17.08). Using the county school value
   * underestimates the bill by ~$900 on a $500k home.
   */
  indSchoolDistrictName?: string
}

type GaStateShape = {
  counties?: Array<{
    slug?: string
    name?: string
    towns?: Array<{ slug?: string; name?: string }>
  }>
}

/**
 * Load GA county + town targets from the canonical state JSON.
 * Mirrors NJ's NJ_TIER1 pattern: single source of truth is the state JSON.
 */
function loadGaTargetsFromStateJson(): {
  counties: Array<{ countySlug: string; countyName: string }>
  towns: GaTownTarget[]
} {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const gaPath = path.join(here, '../../../data/states/georgia.json')
  const raw = JSON.parse(fs.readFileSync(gaPath, 'utf8')) as GaStateShape

  const counties: Array<{ countySlug: string; countyName: string }> = []
  const towns: GaTownTarget[] = []

  for (const county of raw.counties ?? []) {
    const countySlug = String(county.slug ?? '').trim()
    const countyName = String(county.name ?? '').trim()
    if (!countySlug || !countyName) continue

    counties.push({ countySlug, countyName })

    for (const town of county.towns ?? []) {
      const townSlug = String(town.slug ?? '').trim()
      const townName = String(town.name ?? '').trim()
      if (!townSlug || !townName) continue
      towns.push({
        countySlug,
        townSlug,
        townName,
        pdfDistrictName: PDF_DISTRICT_OVERRIDES[townName] ?? townName.toUpperCase(),
        indSchoolDistrictName: IND_SCHOOL_DISTRICTS[townName],
      })
    }
  }

  return { counties, towns }
}

/**
 * Display-name → PDF district label overrides for towns whose canonical
 * display name does not match the DOR digest label.
 *
 * Add entries here whenever a town does not auto-match (look for `[MISSING]`
 * warnings in the millage parser output).
 */
export const PDF_DISTRICT_OVERRIDES: Record<string, string> = {
  // City of Decatur (DeKalb County) is an independent school district. The DOR
  // digest labels its DeKalb-side county entry as "DECATUR 50%" — the 50%
  // reflects that Decatur residents pay only the county M&O portion (school
  // millage runs through the City of Decatur's own independent school district,
  // shown separately as "IND SCHOOL DECATUR 50%").
  Decatur: 'DECATUR 50%',
  // Add more as `[MISSING]` warnings surface during runs.
}

/**
 * Cities whose school millage is set by an INDEPENDENT school district, not the
 * county school. Maps the city's display name → the DOR PDF label for the
 * independent school district.
 *
 * When set, the merge step uses this row's mills instead of the county-wide
 * "SCHOOL" row. Without this, residents of these cities are charged the wrong
 * school millage.
 *
 * Sources: each city's school system is its own legal entity, established by
 * state charter — the City Schools of Decatur, Atlanta Public Schools, Marietta
 * City Schools, Buford City Schools, etc.
 */
export const IND_SCHOOL_DISTRICTS: Record<string, string> = {
  Atlanta: 'IND SCHOOL ATLANTA',
  Decatur: 'IND SCHOOL DECATUR 50%',
  Marietta: 'IND SCHOOL MARIETTA',
  // Add more as launch coverage expands (Buford, Gainesville, Trion, etc.).
}

export const { counties: GA_COUNTIES, towns: GA_TOWNS } = loadGaTargetsFromStateJson()

/**
 * Complete list of Georgia's 159 counties (uppercase, as they appear in DOR PDFs).
 * Used by the OCR parser to disambiguate the leading column on each row,
 * including multi-word names like "BEN HILL", "JEFF DAVIS", "MCDUFFIE".
 */
export const ALL_GA_COUNTIES_UPPER: string[] = [
  'APPLING', 'ATKINSON', 'BACON', 'BAKER', 'BALDWIN', 'BANKS', 'BARROW', 'BARTOW',
  'BEN HILL', 'BERRIEN', 'BIBB', 'BLECKLEY', 'BRANTLEY', 'BROOKS', 'BRYAN', 'BULLOCH',
  'BURKE', 'BUTTS', 'CALHOUN', 'CAMDEN', 'CANDLER', 'CARROLL', 'CATOOSA', 'CHARLTON',
  'CHATHAM', 'CHATTAHOOCHEE', 'CHATTOOGA', 'CHEROKEE', 'CLARKE', 'CLAY', 'CLAYTON',
  'CLINCH', 'COBB', 'COFFEE', 'COLQUITT', 'COLUMBIA', 'COOK', 'COWETA', 'CRAWFORD',
  'CRISP', 'DADE', 'DAWSON', 'DECATUR', 'DEKALB', 'DODGE', 'DOOLY', 'DOUGHERTY',
  'DOUGLAS', 'EARLY', 'ECHOLS', 'EFFINGHAM', 'ELBERT', 'EMANUEL', 'EVANS', 'FANNIN',
  'FAYETTE', 'FLOYD', 'FORSYTH', 'FRANKLIN', 'FULTON', 'GILMER', 'GLASCOCK', 'GLYNN',
  'GORDON', 'GRADY', 'GREENE', 'GWINNETT', 'HABERSHAM', 'HALL', 'HANCOCK', 'HARALSON',
  'HARRIS', 'HART', 'HEARD', 'HENRY', 'HOUSTON', 'IRWIN', 'JACKSON', 'JASPER',
  'JEFF DAVIS', 'JEFFERSON', 'JENKINS', 'JOHNSON', 'JONES', 'LAMAR', 'LANIER', 'LAURENS',
  'LEE', 'LIBERTY', 'LINCOLN', 'LONG', 'LOWNDES', 'LUMPKIN', 'MACON', 'MADISON',
  'MARION', 'MCDUFFIE', 'MCINTOSH', 'MERIWETHER', 'MILLER', 'MITCHELL', 'MONROE',
  'MONTGOMERY', 'MORGAN', 'MURRAY', 'MUSCOGEE', 'NEWTON', 'OCONEE', 'OGLETHORPE',
  'PAULDING', 'PEACH', 'PICKENS', 'PIERCE', 'PIKE', 'POLK', 'PULASKI', 'PUTNAM',
  'QUITMAN', 'RABUN', 'RANDOLPH', 'RICHMOND', 'ROCKDALE', 'SCHLEY', 'SCREVEN', 'SEMINOLE',
  'SPALDING', 'STEPHENS', 'STEWART', 'SUMTER', 'TALBOT', 'TALIAFERRO', 'TATTNALL',
  'TAYLOR', 'TELFAIR', 'TERRELL', 'THOMAS', 'TIFT', 'TOOMBS', 'TOWNS', 'TREUTLEN',
  'TROUP', 'TURNER', 'TWIGGS', 'UNION', 'UPSON', 'WALKER', 'WALTON', 'WARE',
  'WARREN', 'WASHINGTON', 'WAYNE', 'WEBSTER', 'WHEELER', 'WHITE', 'WHITFIELD', 'WILCOX',
  'WILKES', 'WILKINSON', 'WORTH',
]
