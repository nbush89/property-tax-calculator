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
