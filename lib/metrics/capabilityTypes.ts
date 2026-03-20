/**
 * Shared types for geography-scoped metric capabilities (display layer).
 * Data payloads stay in lib/data/types; capabilities answer "may we show this metric here?"
 */

import type { MetricKey } from './metricKeys'

export type GeographyLevel = 'state' | 'county' | 'town'

export type MetricSemantics = 'standard' | 'state_specific' | 'derived' | 'estimated'

export type MetricComparability = 'high' | 'medium' | 'low'

export type MetricAvailability = {
  supported: boolean
  /** Optional key into state JSON `sources` (for linking); may be plain text if no key exists yet */
  sourceRef?: string
  note?: string
  semantics?: MetricSemantics
  comparability?: MetricComparability
}

export type GeographyMetricCapabilities = Partial<Record<MetricKey, MetricAvailability>>

export type StateMetricCapabilities = {
  state?: GeographyMetricCapabilities
  county?: GeographyMetricCapabilities
  town?: GeographyMetricCapabilities
}

/** Calculator / routing flags that are not per-metric display (kept beside metrics config). */
export type StateCalculatorCapabilities = {
  hasCountyAndMunicipalRates: boolean
  hasComptrollerUnitRates: boolean
  hasTownPages: boolean
}

export type StateMetricsConfig = {
  /** Per-geography metric support + semantics */
  metrics: StateMetricCapabilities
  calculator: StateCalculatorCapabilities
}
