/** Shared types for state metrics sourcing and merge payloads. */

export type Unit = 'USD' | 'PERCENT'

export type DataPoint = {
  year: number
  value: number
  unit: Unit
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
  debug?: Record<string, string>
}

export type CountyMetricsPayload = {
  metrics?: {
    effectiveTaxRate?: DataPoint[]
    averageResidentialTaxBill?: DataPoint[]
  }
}

export type StateMetricsSourcePayload = {
  meta: {
    stateSlug: string
    generatedAt: string
    sourceRefs?: string[]
  }
  counties?: Record<string, CountyMetricsPayload>
  /** NJ: keyed by town display name; Texas: keyed by `${countySlug}/${townSlug}` */
  towns?: Record<string, TownMetricsPayload>
  debug?: unknown
}
