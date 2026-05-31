/** Shared types for state metrics sourcing and merge payloads. */

export type Unit = 'USD' | 'PERCENT'

export type DataPoint = {
  year: number
  value: number
  unit: Unit
  sourceRef: string
}

/**
 * Georgia-style millage breakdown (mills, not decimal).
 * Mirrors lib/data/types.ts MillageBreakdown — kept duplicated here so the
 * sourcing scripts don't depend on the app code.
 */
export type MillageBreakdownPayload = {
  year: number
  county?: number
  city?: number
  school?: number
  state?: number
  total: number
  sourceRef: string
}

export type TownMetricsPayload = {
  medianHomeValue?: DataPoint[]
  effectiveTaxRate?: DataPoint[]
  averageResidentialTaxBill?: DataPoint[]
  /**
   * ACS DP04_0087E: Median real estate taxes paid.
   * Reflects the combined bill across all overlapping taxing units
   * (county + city + school district + special districts), net of exemptions.
   * Used as a combined-rate proxy for states where per-unit rates cannot be
   * reliably summed without address-level geographic data (e.g. Texas).
   */
  medianTaxesPaid?: DataPoint[]
  /** Georgia: per-jurisdiction millage. */
  millage?: MillageBreakdownPayload[]
  debug?: Record<string, string>
}

export type CountyMetricsPayload = {
  metrics?: {
    effectiveTaxRate?: DataPoint[]
    averageResidentialTaxBill?: DataPoint[]
    /**
     * ACS B25103 at county level — median real estate taxes paid (USD).
     * Used as the primary trend metric for states that don't publish
     * averageResidentialTaxBill (GA, TX). Honest dollar trend that doesn't
     * mislead the way an effective-rate trend can when home values appreciate
     * faster than millage.
     */
    medianTaxesPaid?: DataPoint[]
    /** Georgia: county-level millage (county + school + state, no city). */
    millage?: MillageBreakdownPayload[]
  }
}

export type StateMetricsPayload = {
  averageTaxRate?: DataPoint[]
}

export type StateMetricsSourcePayload = {
  meta: {
    stateSlug: string
    generatedAt: string
    sourceRefs?: string[]
  }
  /** State-level aggregate metrics (e.g. ACS state-level effective rate). */
  state?: StateMetricsPayload
  counties?: Record<string, CountyMetricsPayload>
  /** NJ: keyed by town display name; Texas: keyed by `${countySlug}/${townSlug}` */
  towns?: Record<string, TownMetricsPayload>
  debug?: unknown
}
