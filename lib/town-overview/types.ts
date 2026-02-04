/**
 * Standard Town Overview schema for property tax town pages.
 * All fields except asOfYear are optional; UI fails gracefully when missing.
 */

/** Source attribution (name, url, retrieved date) */
export interface TownOverviewSource {
  name: string
  url?: string
  retrieved?: string // ISO date
}

/** 5-year (or N-year) trend summary */
export interface TrendSummary {
  startYear: number
  endYear: number
  direction?: 'up' | 'down' | 'flat'
  pctChange?: number // e.g. 6.2 means +6.2%
  series?: Array<{ year: number; value: number }>
}

/** Comparison vs county/state */
export type VsComparison = 'higher' | 'lower' | 'similar' | 'about_the_same'

export interface ComparisonSummary {
  vsCounty?: VsComparison
  vsState?: VsComparison
  explanation?: string
}

/** Data provenance (legacy; prefer sources[]) */
export interface DataProvenance {
  sourceName?: string
  sourceUrl?: string
  lastUpdated?: string
  methodologyUrl?: string
  confidence?: 'official' | 'estimated' | 'mixed'
}

/** Town overview: year-aware at-a-glance stats + comparisons + trend + sources. Canonical field names only. */
export interface TownOverview {
  asOfYear: number
  avgResidentialTaxBill?: number
  effectiveTaxRatePct?: number
  countyAvgTaxBill?: number
  countyEffectiveRatePct?: number
  stateAvgTaxBill?: number
  stateEffectiveTaxRatePct?: number
  /** Median home value (e.g. from Census ACS); prefer over typicalHomeValue when both exist */
  medianHomeValue?: number
  /** Year of median home value estimate */
  medianHomeValueYear?: number
  /** Year of effective tax rate (when different from asOfYear) */
  effectiveTaxRateYear?: number
  /** Year of avg residential tax bill (when different from asOfYear) */
  avgResidentialTaxBillYear?: number
  typicalHomeValue?: number
  vsCounty?: VsComparison
  vsState?: VsComparison
  /** Generic trend % (any series length >= 3) */
  trendPct?: number
  trendStartYear?: number
  trendEndYear?: number
  /** Year/value series used for trend (only when data exists) */
  trendSeries?: Array<{ year: number; value: number }>
  /** Only set when series has >= 5 years; same as trendPct over that 5-year range */
  fiveYearTrendPct?: number
  /** Only set when series has >= 5 years */
  trend5y?: TrendSummary
  comparisons?: ComparisonSummary
  provenance?: DataProvenance
  sources?: TownOverviewSource[]
  notes?: string[]
}
