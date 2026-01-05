/**
 * Helper functions for building town copy context and rendering
 */

import type { StateData, CountyData, TownData } from './types'
import { getLatest, getMetricLatest } from './town-helpers'

/**
 * Context for building town copy
 */
export interface TownCopyContext {
  hasTownRate: boolean
  hasTownHomeValue: boolean
  hasHistory: boolean
  asOfYear: number
  countyName: string
  townName: string
  stateAbbrev: string
  latestRate?: number
  latestRateYear?: number
  latestHomeValue?: number
  latestHomeValueYear?: number
}

/**
 * Build context for town copy generation
 * @param state - State data
 * @param county - County data
 * @param town - Town data
 * @returns Context object with flags and data for copy generation
 */
export function buildTownCopyContext({
  state,
  county,
  town,
}: {
  state: StateData
  county: CountyData
  town: TownData
}): TownCopyContext {
  // Check for town-level effective tax rate
  const townRate = getMetricLatest({
    town,
    county,
    metricKey: 'effectiveTaxRate',
  })
  const hasTownRate = townRate !== undefined

  // Check for town-level median home value
  const townHomeValue = getMetricLatest({
    town,
    county,
    metricKey: 'medianHomeValue',
  })
  const hasTownHomeValue = townHomeValue !== undefined

  // Check if any town metric has >= 2 years of history
  const hasHistory =
    (town.metrics?.effectiveTaxRate?.length ?? 0) >= 2 ||
    (town.metrics?.medianHomeValue?.length ?? 0) >= 2 ||
    (town.metrics?.averageResidentialTaxBill?.length ?? 0) >= 2

  // Determine asOfYear (town > county > state)
  const asOfYear = town.asOfYear ?? county.asOfYear ?? state.asOfYear ?? new Date().getFullYear()

  return {
    hasTownRate,
    hasTownHomeValue,
    hasHistory,
    asOfYear,
    countyName: county.name,
    townName: town.name,
    stateAbbrev: state.abbreviation,
    latestRate: townRate?.value,
    latestRateYear: townRate?.year,
    latestHomeValue: townHomeValue?.value,
    latestHomeValueYear: townHomeValue?.year,
  }
}
