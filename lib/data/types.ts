/**
 * TypeScript types for year-aware property tax data model
 * Matches the normalized JSON structure in /data/states/{state}.json
 */

import type { TownOverview } from '@/lib/town-overview/types'

export type { TownOverview }

/**
 * Unit of measurement for a metric
 */
export type MetricUnit = 'USD' | 'PERCENT'

/**
 * State-specific structural tax mechanics. Currently used by Georgia
 * (40% assessment ratio + statewide standard homestead exemption).
 *
 * For NJ / TX this is unused — they apply the rate directly to fair market
 * value (NJ uses effective rate; TX uses Comptroller unit rate or ACS-implied).
 */
export interface StateTaxStructure {
  /**
   * Fraction of fair market value that becomes assessed value before millage
   * is applied. Georgia: 0.40 (constitutional). Most other states: 1.0 (or
   * omitted — see calculator).
   */
  assessmentRatio?: number
  /**
   * Standard statewide homestead exemption in dollars, subtracted from
   * assessed value for owner-occupied primary residences.
   *
   * Georgia standard homestead: $2,000. Many GA counties stack additional
   * local exemptions on top — those are not captured here.
   */
  standardHomesteadExemption?: number
  /** Free-form notes about the tax structure (rendered into copy). */
  notes?: string
}

/**
 * State metadata (nested under "state" key)
 */
export interface StateMeta {
  name: string
  slug: string
  abbreviation: string
  asOfYear: number
  primarySources?: Record<string, string> // Maps metric keys to sourceRef keys
  /** State-specific structural tax mechanics (see StateTaxStructure). */
  taxStructure?: StateTaxStructure
}

/**
 * Source information (in top-level "sources" map)
 */
export interface Source {
  publisher: string
  title: string
  type: string // e.g., "pdf", "api"
  homepageUrl: string
  yearUrls?: Record<string, string> // Maps year (as string) to URL
  notes?: string
}

/**
 * A single datapoint in a time series metric
 * Uses sourceRef to reference the sources map
 */
export interface DataPoint {
  year: number // Tax year (2000-2030)
  value: number // Numeric value
  unit: MetricUnit // "USD" | "PERCENT"
  sourceRef: string // Reference key to sources map
}

/**
 * Time series for a specific metric (up to 5 years)
 */
export type MetricSeries = DataPoint[]

/**
 * State-level metrics (optional)
 */
export interface StateMetrics {
  averageTaxRate?: MetricSeries
}

/**
 * Per-jurisdiction millage breakdown for states that publish discrete county /
 * city / school / state mill rates (currently Georgia). Values are in mills,
 * NOT decimal — divide by 1000 before multiplying assessed value.
 */
export interface MillageBreakdown {
  /** Tax year these mills apply to */
  year: number
  /** County M&O + Bond mills (county taxing unit) */
  county?: number
  /** City taxing unit mills (M&O + Bond). Town-level only. */
  city?: number
  /** School district mills (M&O + Bond). May be county-wide or independent. */
  school?: number
  /** State mills (typically 0.000 in GA since 2016). */
  state?: number
  /** Total = sum of present components. Persisted to avoid recomputation. */
  total: number
  /** sourceRef key into the state-level sources map. */
  sourceRef: string
}

/**
 * County-level metrics (historical data)
 */
export interface CountyMetrics {
  averageResidentialTaxBill?: MetricSeries
  effectiveTaxRate?: MetricSeries
  /**
   * ACS B25103 county-level — median real estate taxes paid (USD).
   * Used as a trend metric for states without published averageResidentialTaxBill.
   */
  medianTaxesPaid?: MetricSeries
  /**
   * County-level millage components (Georgia). Present when published by the
   * state DOR. Used as a fallback when a town does not have its own city
   * millage row (e.g., user picks a county without selecting a city).
   */
  millage?: MillageBreakdown[]
}

/**
 * Town-level metrics (optional, falls back to county)
 */
export interface TownMetrics {
  averageResidentialTaxBill?: MetricSeries
  effectiveTaxRate?: MetricSeries
  medianHomeValue?: MetricSeries
  /**
   * ACS DP04_0087E: Median real estate taxes paid by owner-occupied households.
   * Captures the full combined bill (county + city + school district + special
   * districts) net of homestead exemptions. Used as a combined-rate proxy for
   * states (e.g. Texas) where overlapping taxing units cannot be reliably
   * summed without address-level geographic lookups.
   */
  medianTaxesPaid?: MetricSeries
  /**
   * Town-level millage components (Georgia). Sum of county + city + school +
   * state mills, used in the assessed-value × millage calculator path.
   */
  millage?: MillageBreakdown[]
}

/**
 * Town copy content (structured for UI rendering)
 */
export interface TownCopy {
  intro?: string[] // Section 1: 2 short paragraphs
  snapshot?: string[] // Section 3: 1 paragraph (variant-aware)
  compare?: string[] // Section 6: Optional comparison paragraph
}

/**
 * Town SEO overrides
 */
export interface TownOverrides {
  displayName?: string
  seoTitle?: string
  seoDescription?: string
}

/**
 * Town rollout metadata for controlled internal linking
 */
export interface TownRollout {
  tier?: number
  featured?: boolean
  isReady?: boolean
  rank?: number
}

/**
 * Town data
 */
export interface TownData {
  name: string
  slug: string
  /** Optional display name (e.g. "Lakewood Township"); falls back to name in UI */
  displayName?: string
  /** Tax year for legacy snapshot fields; may be derived from overview in the adapter */
  asOfYear?: number
  metrics?: TownMetrics
  copy?: TownCopy
  overrides?: TownOverrides
  rollout?: TownRollout
  overview?: TownOverview
  avgRate?: number // Legacy field for backward compatibility (used in rates page)
}

/**
 * County data
 */
export interface CountyData {
  name: string
  slug: string
  asOfYear?: number
  neighborCounties?: string[]
  metrics?: CountyMetrics
  towns?: TownData[]
}

/**
 * State data (normalized structure)
 */
export interface StateData {
  state: StateMeta
  sources: Record<string, Source>
  metrics?: StateMetrics
  counties: CountyData[]
}
