/**
 * Helper functions for town internal linking
 */

import type { TownData, CountyData } from '@/lib/data/types'
import { slugifyLocation, getTownDisplayName } from '@/utils/locationUtils'

/**
 * Build href for a town property tax page. Town URLs use short county slug (e.g. bergen).
 * @param countySlug - County slug (e.g., "bergen") or route segment "bergen-county-property-tax" (normalized to short slug)
 * @param townSlug - Town slug (e.g., "ridgewood")
 * @returns URL path (e.g., "/new-jersey/bergen/ridgewood-property-tax")
 */
export function buildNjTownHref(countySlug: string, townSlug: string): string {
  const short = countySlug.replace(/-county-property-tax$/, '') || countySlug
  return `/new-jersey/${short}/${townSlug}-property-tax`
}

/**
 * Build href for county town index page (all towns in county). Uses same route segment as county page.
 * @param countyRouteSegment - Route param from county page (e.g., "bergen-county-property-tax")
 */
export function buildCountyTownsIndexHref(countyRouteSegment: string): string {
  return `/new-jersey/${countyRouteSegment}/towns`
}

/**
 * Check if a town is ready for linking (has complete copy)
 * @param town - Town data object
 * @returns true if town is ready, false otherwise
 */
export function isTownReady(town: TownData): boolean {
  // Prefer explicit rollout.isReady if present
  if (town.rollout?.isReady !== undefined) {
    return town.rollout.isReady
  }

  // Infer from copy structure: intro >= 2 paragraphs AND snapshot exists
  const hasIntro = (town.copy?.intro?.length ?? 0) >= 2
  const hasSnapshot = (town.copy?.snapshot?.length ?? 0) >= 1

  return hasIntro && hasSnapshot
}

/**
 * Town link data structure
 */
export interface TownLink {
  name: string
  href: string
  reason: 'featured' | 'tier1' | 'ready'
}

/**
 * Get stable slug for a town (for href building). Prefer town.slug, fallback to slugified name.
 */
export function getTownSlug(town: TownData): string {
  if (town.slug) return town.slug
  return slugifyLocation(town.name)
}

/**
 * Select featured towns for county overview page (max 5–8). Used for "Top towns" grid.
 * Includes towns with slug (have a page); prioritizes featured > tier > rank > name.
 * Does NOT filter by isTownReady so new towns appear once they have a slug.
 */
export function selectFeaturedTowns(
  county: CountyData,
  options: { max?: number } = {}
): Array<{ name: string; slug: string; href: string }> {
  const { max = 8 } = options
  if (!county.towns || county.towns.length === 0) return []

  const withSlug = county.towns.filter(t => getTownSlug(t))
  const sorted = [...withSlug].sort((a, b) => {
    const aFeatured = a.rollout?.featured ?? false
    const bFeatured = b.rollout?.featured ?? false
    if (aFeatured !== bFeatured) return aFeatured ? -1 : 1
    const aTier = a.rollout?.tier ?? 999
    const bTier = b.rollout?.tier ?? 999
    if (aTier !== bTier) return aTier - bTier
    const aRank = a.rollout?.rank ?? 999
    const bRank = b.rollout?.rank ?? 999
    if (aRank !== bRank) return aRank - bRank
    return a.name.localeCompare(b.name)
  })

  return sorted.slice(0, max).map(t => ({
    name: getTownDisplayName(t),
    slug: getTownSlug(t),
    href: buildNjTownHref(county.slug, getTownSlug(t)),
  }))
}

/**
 * Select ready towns for county page linking (for "Popular towns" section when feature-flagged)
 * @param county - County data object
 * @param options - Selection options
 * @returns Array of town links, sorted by priority
 */
export function selectCountyTownLinks(
  county: CountyData,
  options: { max?: number } = {}
): TownLink[] {
  const { max = 3 } = options

  if (!county.towns || county.towns.length === 0) {
    return []
  }

  // Filter to ready towns only
  const readyTowns = county.towns.filter(isTownReady)

  if (readyTowns.length === 0) {
    return []
  }

  // Sort by priority: featured > tier1 > others, then by rank, then by name
  const sorted = readyTowns.sort((a, b) => {
    // Featured towns first
    const aFeatured = a.rollout?.featured ?? false
    const bFeatured = b.rollout?.featured ?? false
    if (aFeatured !== bFeatured) {
      return aFeatured ? -1 : 1
    }

    // Then by tier (lower = higher priority)
    const aTier = a.rollout?.tier ?? 999
    const bTier = b.rollout?.tier ?? 999
    if (aTier !== bTier) {
      return aTier - bTier
    }

    // Then by rank (lower = earlier)
    const aRank = a.rollout?.rank ?? 999
    const bRank = b.rollout?.rank ?? 999
    if (aRank !== bRank) {
      return aRank - bRank
    }

    // Finally by name for stable ordering
    return a.name.localeCompare(b.name)
  })

  // Take top N and build links
  return sorted.slice(0, max).map(town => {
    const reason: TownLink['reason'] = town.rollout?.featured
      ? 'featured'
      : town.rollout?.tier === 1
        ? 'tier1'
        : 'ready'

    return {
      name: getTownDisplayName(town),
      href: buildNjTownHref(county.slug, getTownSlug(town)),
      reason,
    }
  })
}
