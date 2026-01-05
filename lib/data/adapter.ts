/**
 * Adapter functions for migrating legacy data format to normalized year-aware format
 * Provides backward compatibility while enabling new features
 */

import type {
  LegacyStateData,
  LegacyCountyData,
  StateData,
  CountyData,
  TownData,
  MetricSeries,
  MetricDatapoint,
  MetricSource,
} from './types'

/**
 * Normalize a legacy county data object to the new format
 * Wraps existing 2024 data into a metrics array while preserving all other fields
 */
function normalizeCountyData(
  legacy: LegacyCountyData | any,
  stateSource: { name: string; year: number; url?: string },
  stateAsOfYear: number,
  sourcesMap?: Record<string, any>
): CountyData {
  const normalized: CountyData = {
    name: legacy.name,
    slug: legacy.slug,
    asOfYear: stateAsOfYear, // Use state's asOfYear
    neighborCounties: legacy.neighborCounties,
    copy: legacy.copy,
    towns: legacy.towns.map((town: any) => {
      // Check if town is already in modern format (has slug property)
      if ('slug' in town && town.slug) {
        // Already modern format - preserve all fields
        return town as TownData
      }

      // Legacy format - convert to modern format
      const townSlug =
        'slug' in town
          ? town.slug || town.name.toLowerCase().replace(/\s+/g, '-')
          : town.name.toLowerCase().replace(/\s+/g, '-')
      const townAsOfYear = 'asOfYear' in town ? town.asOfYear || stateAsOfYear : stateAsOfYear

      return {
        name: town.name,
        slug: townSlug,
        asOfYear: townAsOfYear,
        ...('avgRate' in town && town.avgRate !== undefined && { avgRate: town.avgRate }),
      }
    }),
  }

  // Convert metrics: resolve sourceRef to source objects using sources map
  const metrics: CountyData['metrics'] = {}
  const countyMetrics = (legacy as any).metrics
  const sources = sourcesMap || {}

  // Helper to resolve sourceRef to MetricSource
  const resolveSource = (sourceRef: string, year: number): MetricSource => {
    const sourceInfo = sources[sourceRef]
    if (sourceInfo) {
      // Get year-specific URL if available, otherwise use homepageUrl
      const url = sourceInfo.yearUrls?.[year] || sourceInfo.homepageUrl || sourceInfo.url || ''
      return {
        name: sourceInfo.publisher || sourceInfo.name || '',
        reference: url,
        year: year,
      }
    }
    // Fallback if sourceRef not found
    return {
      name: stateSource.name,
      reference: stateSource.url || '',
      year: year,
    }
  }

  // Normalize averageResidentialTaxBill
  if (countyMetrics?.averageResidentialTaxBill) {
    metrics.averageResidentialTaxBill = countyMetrics.averageResidentialTaxBill.map((d: any) => ({
      year: d.year,
      value: d.value,
      unit: d.unit || 'USD',
      source: d.source || resolveSource(d.sourceRef, d.year),
    }))
  }

  // Normalize effectiveTaxRate
  if (countyMetrics?.effectiveTaxRate) {
    metrics.effectiveTaxRate = countyMetrics.effectiveTaxRate.map((d: any) => ({
      year: d.year,
      value: d.value,
      unit: d.unit || 'PERCENT',
      source: d.source || resolveSource(d.sourceRef, d.year),
    }))
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
export function normalizeStateData(legacy: LegacyStateData | any): StateData {
  // Handle new structure where state is nested
  const stateData = legacy.state || legacy
  const stateAsOfYear = stateData.asOfYear || legacy.source?.year || new Date().getFullYear()
  const stateSource = legacy.source || {
    name: 'NJ Division of Taxation',
    year: stateAsOfYear,
    url: '',
  }

  const normalized: StateData = {
    name: stateData.name || legacy.name,
    slug: stateData.slug || legacy.slug,
    abbreviation: stateData.abbreviation || legacy.abbreviation,
    asOfYear: stateAsOfYear,
    source: stateSource,
    sources: legacy.sources || {},
    counties: (legacy.counties || []).map((county: any) =>
      normalizeCountyData(county, stateSource, stateAsOfYear, legacy.sources)
    ),
  }

  // Normalize state-level metrics if present
  const stateMetrics = (legacy as any).metrics
  const sources = legacy.sources || {}

  if (stateMetrics?.averageTaxRate) {
    normalized.metrics = {
      averageTaxRate: stateMetrics.averageTaxRate.map((d: any) => {
        // Resolve sourceRef to source object
        if (d.source) {
          return d
        }
        const sourceInfo = sources[d.sourceRef]
        const url =
          sourceInfo?.yearUrls?.[d.year] || sourceInfo?.homepageUrl || sourceInfo?.url || ''
        return {
          year: d.year,
          value: d.value,
          unit: d.unit || 'PERCENT',
          source: {
            name: sourceInfo?.publisher || sourceInfo?.name || stateSource.name,
            reference: url,
            year: d.year,
          },
        }
      }),
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
