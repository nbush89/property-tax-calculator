/**
 * Adapter function to get county average residential tax bill series
 * Returns sorted array of { year, value } pairs
 */

import { getStateData, getCountyBySlug } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import type { DataPoint } from '@/lib/data/types'

export type YearValue = { year: number; value: number }

/**
 * Get county average residential tax bill series
 * @param stateSlug - State slug (e.g., "new-jersey")
 * @param countyName - County name (e.g., "Bergen")
 * @returns Sorted array of { year, value } pairs, or empty array if not found
 */
export function getCountyAvgTaxBillSeries(stateSlug: string, countyName: string): YearValue[] {
  const stateData = getStateData(stateSlug)
  if (!stateData) {
    return []
  }

  // Get county by name (convert to slug for lookup)
  const countySlug = slugifyLocation(countyName)
  const county = getCountyBySlug(stateData, countySlug)
  if (!county) {
    return []
  }

  // Get the average residential tax bill series
  const series = county.metrics?.averageResidentialTaxBill
  if (!series || series.length === 0) {
    return []
  }

  // Normalize to { year, value } format
  // Filter out invalid points and ensure years are integers
  const normalized: YearValue[] = series
    .filter((point: DataPoint) => {
      return (
        point.year != null &&
        point.value != null &&
        !isNaN(point.year) &&
        !isNaN(point.value) &&
        point.value > 0 &&
        Number.isInteger(point.year)
      )
    })
    .map((point: DataPoint) => ({
      year: Number(point.year),
      value: Number(point.value),
    }))

  // Sort ascending by year
  normalized.sort((a, b) => a.year - b.year)

  return normalized
}
