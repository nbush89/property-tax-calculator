import njStateDataRaw from '@/data/states/new-jersey.json'
import { slugifyLocation } from '@/utils/locationUtils'
import { normalizeStateData } from '@/lib/data/adapter'
import type { StateData, CountyData } from '@/lib/data/types'

// Normalize the raw JSON data to the new year-aware format
const njStateData = normalizeStateData(njStateDataRaw as any)

/**
 * Registry of state data files
 * Maps state slugs to their imported data (normalized)
 */
const stateDataRegistry: Record<string, StateData> = {
  'new-jersey': njStateData,
  // Add more states here as they're added:
  // 'california': normalizeStateData(caStateDataRaw),
  // 'texas': normalizeStateData(txStateDataRaw),
}

// Re-export types for convenience
export type { StateData, CountyData } from '@/lib/data/types'

/**
 * Get state data by slug
 * @param stateSlug - The slug of the state (e.g., "new-jersey")
 * @returns StateData or null if state not found
 */
export function getStateData(stateSlug: string): StateData | null {
  const normalizedSlug = stateSlug.toLowerCase()
  const data = stateDataRegistry[normalizedSlug]
  if (!data) return null

  // Data is already normalized in the registry
  return data
}

/**
 * Get New Jersey state data (backward compatibility)
 * @deprecated Use getStateData('new-jersey') instead
 */
export function getNJStateData(): StateData {
  return getStateData('new-jersey')!
}

/**
 * Get a county by slug
 */
export function getCountyBySlug(state: StateData, countySlug: string): CountyData | null {
  const normalizedSlug = countySlug.toLowerCase().replace(/-county$/, '')
  return (
    state.counties.find(
      county => county.slug === normalizedSlug || slugifyLocation(county.name) === normalizedSlug
    ) || null
  )
}

/**
 * Format USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
