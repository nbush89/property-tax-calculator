/**
 * Adapter functions for migrating legacy data format to normalized year-aware format
 * Provides backward compatibility while enabling new features
 */

import type {
  LegacyStateData,
  LegacyCountyData,
  StateData,
  CountyData,
  MetricSeries,
  MetricDatapoint,
} from './types'

/**
 * Normalize a legacy county data object to the new format
 * Wraps existing 2024 data into a metrics array while preserving all other fields
 */
function normalizeCountyData(
  legacy: LegacyCountyData,
  stateSource: { name: string; year: number; url?: string },
  stateAsOfYear: number
): CountyData {
  const normalized: CountyData = {
    name: legacy.name,
    slug: legacy.slug,
    asOfYear: stateAsOfYear, // Use state's asOfYear
    neighborCounties: legacy.neighborCounties,
    copy: legacy.copy,
    towns: legacy.towns.map(town => ({
      name: town.name,
      slug: town.name.toLowerCase().replace(/\s+/g, '-'), // Generate slug from name
      asOfYear: stateAsOfYear, // Use state's asOfYear
      avgRate: town.avgRate, // Keep legacy field for backward compatibility
    })),
  }

  // Create metrics object with 2024 data wrapped in arrays
  const metrics: CountyData['metrics'] = {}

  if (legacy.avgResidentialTaxBill2024 !== undefined) {
    const taxBillSeries: MetricSeries = [
      {
        year: 2024,
        value: legacy.avgResidentialTaxBill2024,
        unit: 'USD',
        source: {
          name: stateSource.name,
          reference: stateSource.url,
          year: stateSource.year,
        },
      },
    ]
    metrics.averageResidentialTaxBill = taxBillSeries
  }

  if (legacy.avgEffectiveRate !== undefined) {
    const rateSeries: MetricSeries = [
      {
        year: 2024,
        value: legacy.avgEffectiveRate,
        unit: 'rate',
        source: {
          name: stateSource.name,
          reference: stateSource.url,
          year: stateSource.year,
        },
      },
    ]
    metrics.effectiveTaxRate = rateSeries
  }

  if (Object.keys(metrics).length > 0) {
    normalized.metrics = metrics
  }

  return normalized
}

/**
 * Normalize legacy state data to the new year-aware format
 * Preserves all existing fields and wraps single-year data into metrics arrays
 */
export function normalizeStateData(legacy: LegacyStateData): StateData {
  const stateAsOfYear = legacy.source.year // Use source year as latest

  const normalized: StateData = {
    name: legacy.name,
    slug: legacy.slug,
    abbreviation: legacy.abbreviation,
    asOfYear: stateAsOfYear,
    source: legacy.source,
    counties: legacy.counties.map(county =>
      normalizeCountyData(county, legacy.source, stateAsOfYear)
    ),
  }

  // Wrap state-level avgTaxRate into metrics if present
  if (legacy.avgTaxRate !== undefined) {
    normalized.metrics = {
      averageTaxRate: [
        {
          year: legacy.source.year,
          value: legacy.avgTaxRate,
          unit: 'rate',
          source: {
            name: legacy.source.name,
            reference: legacy.source.url,
            year: legacy.source.year,
          },
        },
      ],
    }
  }

  return normalized
}

/**
 * Get the latest average residential tax bill for a county (backward compatibility helper)
 * @param county - County data (normalized or legacy)
 * @returns The latest tax bill value, or null if not available
 */
export function getCountyLatestTaxBill(county: CountyData): number | null {
  // Use new metrics format
  if (county.metrics?.averageResidentialTaxBill) {
    const latest =
      county.metrics.averageResidentialTaxBill[county.metrics.averageResidentialTaxBill.length - 1]
    if (latest) {
      return latest.value
    }
  }

  return null
}

/**
 * Get the latest effective tax rate for a county (backward compatibility helper)
 * @param county - County data (normalized or legacy)
 * @returns The latest effective rate, or null if not available
 */
export function getCountyLatestRate(county: CountyData): number | null {
  // Use new metrics format
  if (county.metrics?.effectiveTaxRate) {
    const latest = county.metrics.effectiveTaxRate[county.metrics.effectiveTaxRate.length - 1]
    if (latest) {
      return latest.value
    }
  }

  return null
}

/**
 * Get the latest average tax rate for a state (backward compatibility helper)
 * @param state - State data (normalized or legacy)
 * @returns The latest tax rate, or null if not available
 */
export function getStateLatestTaxRate(state: StateData): number | null {
  // Use new metrics format
  if (state.metrics?.averageTaxRate) {
    const latest = state.metrics.averageTaxRate[state.metrics.averageTaxRate.length - 1]
    if (latest) {
      return latest.value
    }
  }

  return null
}
