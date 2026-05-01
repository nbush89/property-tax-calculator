import { buildRecentYears } from '../../utils/buildRecentYears'

/**
 * Texas Comptroller Tax Rates and Levies — published total tax rate ($ / $100 taxable value)
 * for the county or city taxing unit. Same numeric field as percent of value for that unit.
 * Not the combined homeowner bill across all overlapping jurisdictions.
 */
export const TX_RATES_SOURCE_REF = 'tx_comptroller_tax_rates_levies'

const CURRENT_YEAR = new Date().getFullYear()

export const TX_COUNTY_RATES_URL = (year: number) =>
  `https://comptroller.texas.gov/taxes/property-tax/docs/${year}-county-rates-levies.xlsx`

export const TX_CITY_RATES_URL = (year: number) =>
  `https://comptroller.texas.gov/taxes/property-tax/docs/${year}-city-rates-levies.xlsx`

/** Years to attempt (404 skipped). */
export const TX_RATE_YEARS = buildRecentYears({
  endYear: CURRENT_YEAR - 1,
  window: 6,
})

/**
 * Geo groups a town under one county; Comptroller CAD county may differ.
 * Key: `${countySlug}/${townSlug}` → workbook COUNTY NAME for city sheet lookup.
 */
export const TEXAS_CITY_WORKBOOK_COUNTY: Record<string, string> = {
  /** Plano is in Collin County in site data; keep legacy merge key for older metric extracts */
  'dallas/plano': 'Collin',
  'collin/plano': 'Collin',
  /** Multi-county cities — Comptroller lists them under their primary/incorporation county */
  'dallas/carrollton': 'Dallas',     // spans Dallas/Denton/Collin; primary CAD is Dallas
  'dallas/grand-prairie': 'Dallas',  // spans Dallas/Tarrant; primary CAD is Dallas
  'dallas/rowlett': 'Dallas',        // spans Dallas/Rockwall; primary CAD is Dallas
  'tarrant/euless': 'Tarrant',       // spans Tarrant/Dallas; primary CAD is Tarrant
  'tarrant/grapevine': 'Tarrant',    // spans Tarrant/Dallas; primary CAD is Tarrant
  'tarrant/burleson': 'Tarrant',     // spans Tarrant/Johnson; primary CAD is Tarrant
}
