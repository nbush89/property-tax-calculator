/**
 * Utility functions for accessing state data
 */
import njStateData from '@/data/states/new-jersey.json'
import { slugifyLocation } from './locationUtils'

export type County = typeof njStateData.counties[0]
export type Town = County['towns'][0]
export type StateData = typeof njStateData

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
export function getCountyBySlug(countySlug: string): County | null {
  const normalizedSlug = countySlug.toLowerCase().replace(/-county$/, '')
  return njStateData.counties.find(
    county => county.slug === normalizedSlug || slugifyLocation(county.name) === normalizedSlug
  ) || null
}

/**
 * Get a county by name
 */
export function getCountyByName(countyName: string): County | null {
  return njStateData.counties.find(
    county => county.name.toLowerCase() === countyName.toLowerCase()
  ) || null
}

/**
 * Get a town by county and town slug
 */
export function getTownBySlugs(countySlug: string, townSlug: string): { county: County; town: Town } | null {
  const county = getCountyBySlug(countySlug)
  if (!county) return null

  const normalizedTownSlug = townSlug.toLowerCase().replace(/-property-tax$/, '')
  const town = county.towns.find(
    t => slugifyLocation(t.name) === normalizedTownSlug || t.name.toLowerCase() === normalizedTownSlug.replace(/-/g, ' ')
  )

  return town ? { county, town } : null
}

/**
 * Get neighbor counties for a given county
 */
export function getNeighborCounties(countySlug: string): County[] {
  const county = getCountyBySlug(countySlug)
  if (!county) return []

  return county.neighborCounties
    .map(neighborName => getCountyByName(neighborName))
    .filter((c): c is County => c !== null)
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
export function compareToStateAverage(rate: number): { difference: number; isHigher: boolean; percentage: string } {
  const stateAvg = njStateData.avgTaxRate
  const difference = rate - stateAvg
  const percentage = Math.abs((difference / stateAvg) * 100)
  
  return {
    difference,
    isHigher: difference > 0,
    percentage: `${percentage.toFixed(1)}%`
  }
}

