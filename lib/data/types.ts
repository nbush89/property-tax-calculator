/**
 * TypeScript types for year-aware property tax data model
 * Supports up to 5 years of historical data with backward compatibility
 */

/**
 * Unit of measurement for a metric
 */
export type MetricUnit = 'USD' | 'percentage' | 'rate'

/**
 * Unit of measurement for town metrics (simplified)
 */
export type TownMetricUnit = 'USD' | 'PERCENT'

/**
 * Source information for a metric datapoint (used in county/state metrics)
 */
export interface MetricSource {
  name: string
  reference?: string // URL or citation string
  year?: number // Year of the source report
}

/**
 * Source reference map (top-level in state data)
 */
export interface SourceReference {
  name: string
  reference: string
  url?: string
  notes?: string
}

/**
 * A single datapoint in a time series metric (used in county/state metrics)
 */
export interface MetricDatapoint {
  year: number // Tax year (2000-2030)
  value: number // Numeric value
  unit: MetricUnit // Unit of measurement
  source: MetricSource // Source information
}

/**
 * A single datapoint in a town metric time series (uses sourceRef instead of full source)
 */
export interface TownDataPoint {
  year: number // Tax year (2000-2030)
  value: number // Numeric value
  unit: TownMetricUnit // Unit of measurement ("USD" | "PERCENT")
  sourceRef: string // Reference key to sources map
}

/**
 * Time series for a specific metric (up to 5 years)
 */
export type MetricSeries = MetricDatapoint[]

/**
 * County-level metrics (historical data)
 */
export interface CountyMetrics {
  averageResidentialTaxBill?: MetricSeries
  effectiveTaxRate?: MetricSeries
}

/**
 * Town-level metrics (optional, falls back to county)
 * Uses TownDataPoint with sourceRef instead of full source objects
 */
export interface TownMetrics {
  averageResidentialTaxBill?: TownDataPoint[]
  effectiveTaxRate?: TownDataPoint[]
  medianHomeValue?: TownDataPoint[]
}

/**
 * County copy content (unchanged from original)
 */
export interface CountyCopy {
  paragraphs: string[]
  disclaimer: string
}

/**
 * Town copy content (structured for UI rendering)
 * Maps to specific page sections with variant-aware content
 */
export interface TownCopy {
  intro?: string[] // Section 1: 2 short paragraphs (70-100 words total) - town-specific intro context
  snapshot?: string[] // Section 3: 1 paragraph (variant-aware: town data vs county fallback)
  compare?: string[] // Section 6: Optional comparison paragraph with internal linking context
  // Note: Section 2 (how it works), Section 4 (calculator), Section 5 (trends), Section 7 (disclaimer)
  // are component-level static text, not stored in JSON
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
  tier?: number // 1 = Tier-1, higher = lower priority
  featured?: boolean // Featured towns get priority
  isReady?: boolean // Explicit readiness flag
  rank?: number // Stable ordering within county (lower = earlier)
}

/**
 * Town data (with optional metrics, copy, and overrides)
 */
export interface TownData {
  name: string
  slug: string
  asOfYear: number
  metrics?: TownMetrics
  copy?: TownCopy
  overrides?: TownOverrides
  rollout?: TownRollout
  avgRate?: number // Legacy field for backward compatibility
}

/**
 * County data (normalized with metrics)
 */
export interface CountyData {
  name: string
  slug: string
  asOfYear?: number // Latest year for which data is available
  neighborCounties?: string[]
  metrics?: CountyMetrics
  copy?: CountyCopy
  towns?: TownData[]
}

/**
 * State-level metrics (optional)
 */
export interface StateMetrics {
  averageTaxRate?: MetricSeries
}

/**
 * State data (normalized with metrics)
 */
export interface StateData {
  name: string
  slug: string
  abbreviation: string
  asOfYear?: number // Latest year for which data is available
  source: {
    name: string
    year: number
    url?: string
  }
  sources?: Record<string, SourceReference> // Top-level source reference map
  metrics?: StateMetrics
  counties: CountyData[]
}

/**
 * Legacy county data shape (for migration/adapter)
 */
export interface LegacyCountyData {
  name: string
  slug: string
  avgEffectiveRate: number
  avgResidentialTaxBill2024: number
  neighborCounties?: string[]
  towns: Array<
    | { name: string; avgRate: number } // Legacy format
    | TownData // Modern format with full structure
  >
  copy: {
    paragraphs: string[]
    disclaimer: string
  }
}

/**
 * Legacy state data shape (for migration/adapter)
 */
export interface LegacyStateData {
  name: string
  slug: string
  abbreviation: string
  avgTaxRate: number
  source: {
    name: string
    year: number
    url: string
  }
  counties: LegacyCountyData[]
}
