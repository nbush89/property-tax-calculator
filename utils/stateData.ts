/**
 * Utility functions for accessing state data
 */
import njStateDataRaw from '@/data/states/new-jersey.json'
import { slugifyLocation } from './locationUtils'
import { normalizeStateData } from '@/lib/data/adapter'
import type { StateData, CountyData, TownData } from '@/lib/data/types'

// Normalize the data to use the new metrics structure
const njStateData = normalizeStateData(njStateDataRaw as any)

export type County = CountyData
export type Town = TownData
export type { StateData }

/**
 * Get state data for New Jersey
 */
export function getNewJerseyData(): StateData {
  return njStateData
}

/**
 * Get all counties for New Jersey
 */
export function getNewJerseyCounties(): County[] {
  return njStateData.counties
}

/**
 * Get a county by slug
 */
export function getCountyBySlug(countySlug: string): CountyData | null {
  const normalizedSlug = countySlug.toLowerCase().replace(/-county$/, '')
  return (
    njStateData.counties.find(
      county => county.slug === normalizedSlug || slugifyLocation(county.name) === normalizedSlug
    ) || null
  )
}

/**
 * Get a county by name
 */
export function getCountyByName(countyName: string): CountyData | null {
  return (
    njStateData.counties.find(county => county.name.toLowerCase() === countyName.toLowerCase()) ||
    null
  )
}

/**
 * Get a town by county and town slug
 */
export function getTownBySlugs(
  countySlug: string,
  townSlug: string
): { county: CountyData; town: TownData } | null {
  const county = getCountyBySlug(countySlug)
  if (!county || !county.towns) return null

  const normalizedTownSlug = townSlug.toLowerCase().replace(/-property-tax$/, '')
  const town = county.towns.find(
    t =>
      slugifyLocation(t.name) === normalizedTownSlug ||
      t.name.toLowerCase() === normalizedTownSlug.replace(/-/g, ' ')
  )

  return town ? { county, town } : null
}

/**
 * Get neighbor counties for a given county
 */
export function getNeighborCounties(countySlug: string): CountyData[] {
  const county = getCountyBySlug(countySlug)
  if (!county || !county.neighborCounties) return []

  return county.neighborCounties
    .map(neighborName => getCountyByName(neighborName))
    .filter((c): c is CountyData => c !== null)
}

/**
 * Format tax rate as percentage
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

/**
 * Compare rate to state average
 */
export function compareToStateAverage(rate: number): {
  difference: number
  isHigher: boolean
  percentage: string
} {
  // Get state average from metrics
  const stateAvg =
    njStateData.metrics?.averageTaxRate?.[njStateData.metrics.averageTaxRate.length - 1]?.value || 0

  if (stateAvg === 0) {
    return {
      difference: 0,
      isHigher: false,
      percentage: '0%',
    }
  }

  const difference = rate - stateAvg
  const percentage = Math.abs((difference / stateAvg) * 100)

  return {
    difference,
    isHigher: difference > 0,
    percentage: `${percentage.toFixed(1)}%`,
  }
}
