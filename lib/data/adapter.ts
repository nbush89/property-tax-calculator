/**
 * Data validation and normalization functions
 * Since JSON is already normalized, this primarily validates and ensures data integrity
 */

import type { StateData, CountyData, TownData } from './types'
import { assertSorted, assertMaxLength } from './metrics'
import { slugifyLocation } from '@/utils/locationUtils'

/**
 * Validate and normalize state data
 * Ensures series are sorted, within length limits, and have correct structure
 */
export function normalizeStateData(raw: any): StateData {
  // Basic structure validation
  if (!raw.state || !raw.sources || !Array.isArray(raw.counties)) {
    throw new Error('Invalid state data structure: missing state, sources, or counties')
  }

  const normalized: StateData = {
    state: raw.state,
    sources: raw.sources,
    metrics: raw.metrics,
    counties: raw.counties.map((county: any) => normalizeCountyData(county)),
  }

  // Validate state-level metrics
  if (normalized.metrics?.averageTaxRate) {
    assertSorted(normalized.metrics.averageTaxRate, 'state.metrics.averageTaxRate')
    assertMaxLength(normalized.metrics.averageTaxRate, 'state.metrics.averageTaxRate')
  }

  return normalized
}

/**
 * Validate and normalize county data
 * Ensures metrics series are sorted and within limits
 */
function normalizeTownData(raw: any): TownData {
  const name = raw.name
  const slug = raw.slug ?? slugifyLocation(name)
  const asOfYear = raw.asOfYear ?? new Date().getFullYear()
  return { ...raw, name, slug, asOfYear } as TownData
}

function normalizeCountyData(raw: any): CountyData {
  const normalized: CountyData = {
    name: raw.name,
    slug: raw.slug,
    asOfYear: raw.asOfYear,
    neighborCounties: raw.neighborCounties,
    copy: raw.copy,
    towns: Array.isArray(raw.towns) ? raw.towns.map((t: any) => normalizeTownData(t)) : undefined,
  }

  // Validate county metrics
  if (raw.metrics) {
    const metrics: CountyData['metrics'] = {}

    if (raw.metrics.averageResidentialTaxBill) {
      assertSorted(
        raw.metrics.averageResidentialTaxBill,
        'county.metrics.averageResidentialTaxBill'
      )
      assertMaxLength(
        raw.metrics.averageResidentialTaxBill,
        'county.metrics.averageResidentialTaxBill'
      )
      metrics.averageResidentialTaxBill = raw.metrics.averageResidentialTaxBill
    }

    if (raw.metrics.effectiveTaxRate) {
      assertSorted(raw.metrics.effectiveTaxRate, 'county.metrics.effectiveTaxRate')
      assertMaxLength(raw.metrics.effectiveTaxRate, 'county.metrics.effectiveTaxRate')
      metrics.effectiveTaxRate = raw.metrics.effectiveTaxRate
    }

    if (Object.keys(metrics).length > 0) {
      normalized.metrics = metrics
    }
  }

  return normalized
}
