import njStateData from '@/data/states/new-jersey.json'
import { slugifyLocation } from '@/utils/locationUtils'

export type CountyData = {
  name: string
  slug: string
  avgEffectiveRate: number
  avgResidentialTaxBill2024: number
  neighborCounties?: string[]
  towns: Array<{ name: string; avgRate: number }>
  copy: {
    paragraphs: string[]
    disclaimer: string
  }
}

export type StateData = {
  name: string
  slug: string
  abbreviation: string
  avgTaxRate: number
  source: {
    name: string
    year: number
    url: string
  }
  counties: CountyData[]
}

/**
 * Registry of state data files
 * Maps state slugs to their imported data
 */
const stateDataRegistry: Record<string, StateData> = {
  'new-jersey': njStateData as StateData,
  // Add more states here as they're added:
  // 'california': caStateData as StateData,
  // 'texas': txStateData as StateData,
}

/**
 * Get state data by slug
 * @param stateSlug - The slug of the state (e.g., "new-jersey")
 * @returns StateData or null if state not found
 */
export function getStateData(stateSlug: string): StateData | null {
  const normalizedSlug = stateSlug.toLowerCase()
  return stateDataRegistry[normalizedSlug] || null
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
