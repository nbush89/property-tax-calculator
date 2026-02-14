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
 * State metadata (nested under "state" key)
 */
export interface StateMeta {
  name: string
  slug: string
  abbreviation: string
  asOfYear: number
  primarySources?: Record<string, string> // Maps metric keys to sourceRef keys
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
 * County-level metrics (historical data)
 */
export interface CountyMetrics {
  averageResidentialTaxBill?: MetricSeries
  effectiveTaxRate?: MetricSeries
}

/**
 * Town-level metrics (optional, falls back to county)
 */
export interface TownMetrics {
  averageResidentialTaxBill?: MetricSeries
  effectiveTaxRate?: MetricSeries
  medianHomeValue?: MetricSeries
}

/**
 * County copy content
 */
export interface CountyCopy {
  paragraphs: string[]
  disclaimer: string
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
  asOfYear: number
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
  copy?: CountyCopy
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
