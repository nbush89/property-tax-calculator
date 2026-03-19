import njStateDataRaw from '@/data/states/new-jersey.json'
import texasStateDataRaw from '@/data/states/texas.json'
import { slugifyLocation } from '@/utils/locationUtils'
import { normalizeStateData } from '@/lib/data/adapter'
import type { StateData, CountyData, TownData } from '@/lib/data/types'

// Normalize the raw JSON data to the new year-aware format
const njStateData = normalizeStateData(njStateDataRaw as any)
const texasStateData = normalizeStateData(texasStateDataRaw as any)

/**
 * Registry of state data files
 * Maps state slugs to their imported data (normalized)
 */
const stateDataRegistry: Record<string, StateData> = {
  'new-jersey': njStateData,
  texas: texasStateData,
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

export interface AvailableState {
  slug: string
  name: string
}

/**
 * List states available in the registry (for nav, homepage, and neutral landings).
 * Derives from state data; add states to the registry to have them appear here.
 */
export function getAvailableStates(): AvailableState[] {
  return Object.values(stateDataRegistry).map(data => ({
    slug: data.state.slug,
    name: data.state.name,
  }))
}

/** State/county/town tree for hero dropdowns (no heavy metrics). */
export interface StateOptionForHero {
  slug: string
  name: string
  counties: { slug: string; name: string; towns: { slug: string; name: string }[] }[]
}

/**
 * Build state → county → town options for the homepage hero form.
 * Reads from the state registry; add states to the registry to have them appear.
 */
export function getStatesForHero(): StateOptionForHero[] {
  return getAvailableStates().map(s => {
    const data = getStateData(s.slug)
    if (!data) return { slug: s.slug, name: s.name, counties: [] }
    return {
      slug: data.state.slug,
      name: data.state.name,
      counties: (data.counties ?? []).map(c => ({
        slug: c.slug || slugifyLocation(c.name),
        name: c.name,
        towns: (c.towns ?? []).map(t => ({
          slug: t.slug || slugifyLocation(t.name),
          name: t.displayName ?? t.name,
        })),
      })),
    }
  })
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
  const normalizedSlug = countySlug
    .toLowerCase()
    .replace(/-county-property-tax$/, '')
    .replace(/-county$/, '')
  return (
    state.counties.find(
      county => county.slug === normalizedSlug || slugifyLocation(county.name) === normalizedSlug
    ) || null
  )
}

/**
 * Resolve a town from URL segments: /[state]/[countySlug]/[townSlug]-property-tax
 * Accepts short county slug (e.g. bergen) or full route segment (e.g. bergen-county-property-tax).
 */
export function getTownBySlugs(
  stateSlug: string,
  countySlug: string,
  townSlug: string
): { county: CountyData; town: TownData } | null {
  const stateData = getStateData(stateSlug)
  if (!stateData) return null

  const decodedCounty = decodeURIComponent(countySlug)
  const county = getCountyBySlug(stateData, decodedCounty)
  if (!county || !county.towns) return null

  const normalizedTownSlug = decodeURIComponent(townSlug)
    .toLowerCase()
    .replace(/-property-tax$/, '')
  const town = county.towns.find(
    t =>
      slugifyLocation(t.name) === normalizedTownSlug ||
      t.name.toLowerCase() === normalizedTownSlug.replace(/-/g, ' ')
  )

  return town ? { county, town } : null
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
