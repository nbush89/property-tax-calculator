/**
 * Per-state capability flags so the calculator and UI can adapt when a state
 * does not support the same rate breakdown as NJ (e.g. county + municipal).
 */

export interface StateCapabilities {
  /** Calculator can show county + municipal rate breakdown (e.g. NJ). */
  hasCountyAndMunicipalRates: boolean
  /** State/county/town pages show average residential tax bill. */
  hasAverageTaxBill: boolean
  /** Town-level detail pages are available (published when metrics exist). */
  hasTownPages: boolean
}

const capabilitiesByState: Record<string, StateCapabilities> = {
  'new-jersey': {
    hasCountyAndMunicipalRates: true,
    hasAverageTaxBill: true,
    hasTownPages: true,
  },
  texas: {
    hasCountyAndMunicipalRates: false,
    hasAverageTaxBill: false,
    hasTownPages: true,
  },
}

/**
 * Get capability flags for a state. Returns defaults (all false) for unknown states.
 */
export function getStateCapabilities(stateSlug: string): StateCapabilities {
  const key = stateSlug?.toLowerCase()
  return (
    capabilitiesByState[key] ?? {
      hasCountyAndMunicipalRates: false,
      hasAverageTaxBill: false,
      hasTownPages: true,
    }
  )
}

/**
 * Whether the calculator can run for this state (has at least county rate or equivalent).
 */
export function canCalculateForState(stateSlug: string): boolean {
  return getStateCapabilities(stateSlug).hasCountyAndMunicipalRates
}
