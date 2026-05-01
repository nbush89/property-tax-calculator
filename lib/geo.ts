import njStateDataRaw from '@/data/states/new-jersey.json'
import texasStateDataRaw from '@/data/states/texas.json'
import { slugifyLocation } from '@/utils/locationUtils'
import { normalizeStateData } from '@/lib/data/adapter'
import type { StateData, CountyData, TownData } from '@/lib/data/types'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { getTownSlug } from '@/lib/links/towns'

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
 * A single county entry for the hero data table.
 */
export interface TopCountyForHero {
  name: string
  slug: string
  effectiveRatePct: number | null
  avgBill: number | null
  /**
   * Up to 5 deduplicated values for the sparkline, oldest→newest.
   * Uses averageResidentialTaxBill (dollars) when available, falls back to effectiveTaxRate (%).
   */
  trend: number[]
  /** What `trend` measures — determines sparkline label */
  trendType: 'bill' | 'rate'
  /** Number of published town pages for this county */
  publishedTownCount: number
}

/**
 * Top counties for the hero data table, sorted by avg residential tax bill descending.
 * Falls back to effective rate ordering when avg bill is unavailable (e.g. Texas pre-pipeline).
 */
/**
 * Deduplicate a metric series by year, keeping the last entry per year.
 * Guards against duplicate-year artifacts from data merges.
 */
function dedupeByYear(series: { year: number; value: number }[]): { year: number; value: number }[] {
  const map = new Map<number, number>()
  for (const p of series) map.set(p.year, p.value)
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, value]) => ({ year, value }))
}

export function getTopCountiesForHero(stateSlug: string, limit = 5): TopCountyForHero[] {
  const data = getStateData(stateSlug)
  if (!data) return []

  const counties = data.counties.map(c => {
    const rateSeries = dedupeByYear(c.metrics?.effectiveTaxRate ?? [])
    const billSeries = dedupeByYear(c.metrics?.averageResidentialTaxBill ?? [])

    const latestRate = rateSeries.length ? rateSeries[rateSeries.length - 1].value : null
    const latestBill = billSeries.length ? billSeries[billSeries.length - 1].value : null

    // Prefer bill trend (dollars people actually pay); fall back to rate trend
    const hasBillTrend = billSeries.length >= 2
    const trend = hasBillTrend
      ? billSeries.slice(-5).map(p => p.value)
      : rateSeries.slice(-5).map(p => p.value)
    const trendType: 'bill' | 'rate' = hasBillTrend ? 'bill' : 'rate'

    const publishedTownCount = (c.towns ?? []).filter(
      t => getTownSlug(t) && isTownPublished(t)
    ).length

    return {
      name: c.name,
      slug: c.slug || slugifyLocation(c.name),
      effectiveRatePct: latestRate,
      avgBill: latestBill,
      trend,
      trendType,
      publishedTownCount,
    }
  })

  // Sort by avg bill desc; fall back to rate desc when bill is null
  counties.sort((a, b) => {
    if (a.avgBill != null && b.avgBill != null) return b.avgBill - a.avgBill
    if (a.avgBill != null) return -1
    if (b.avgBill != null) return 1
    return (b.effectiveRatePct ?? 0) - (a.effectiveRatePct ?? 0)
  })

  return counties.slice(0, limit)
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
      t.slug === normalizedTownSlug ||
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
