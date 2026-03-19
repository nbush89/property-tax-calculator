/**
 * Per-state capability flags for the calculator and routing.
 * Declared alongside metric display capabilities in `lib/metrics/stateMetricCapabilities`.
 */

import {
  getStateMetricsConfig,
  stateSupportsAverageTaxBill,
} from '@/lib/metrics/stateMetricCapabilities'

export interface StateCapabilities {
  /** Calculator can show county + municipal rate breakdown (e.g. NJ). */
  hasCountyAndMunicipalRates: boolean
  /** Texas-style: Comptroller city/county unit rate; do not add county + city (double count). */
  hasComptrollerUnitRates: boolean
  /** State/county/town pages may show average residential tax bill (metric capability). */
  hasAverageTaxBill: boolean
  /** Town-level detail pages are available (published when metrics exist). */
  hasTownPages: boolean
}

const defaultCapabilities: StateCapabilities = {
  hasCountyAndMunicipalRates: false,
  hasComptrollerUnitRates: false,
  hasAverageTaxBill: false,
  hasTownPages: true,
}

/**
 * Get capability flags for a state. Returns defaults for unknown states.
 */
export function getStateCapabilities(stateSlug: string): StateCapabilities {
  const key = stateSlug?.toLowerCase() ?? ''
  const cfg = getStateMetricsConfig(key)
  if (!cfg) {
    return { ...defaultCapabilities }
  }
  return {
    hasCountyAndMunicipalRates: cfg.calculator.hasCountyAndMunicipalRates,
    hasComptrollerUnitRates: cfg.calculator.hasComptrollerUnitRates,
    hasAverageTaxBill: stateSupportsAverageTaxBill(key),
    hasTownPages: cfg.calculator.hasTownPages,
  }
}

/**
 * Whether the calculator can run for this state (has at least county rate or equivalent).
 */
export function canCalculateForState(stateSlug: string): boolean {
  const c = getStateCapabilities(stateSlug)
  return c.hasCountyAndMunicipalRates || c.hasComptrollerUnitRates
}
