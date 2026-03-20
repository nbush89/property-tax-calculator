/**
 * Map canonical site paths to entity slugs for Search Console landing pages.
 * Extension: county-level readiness could plug in here before marking matched.
 */

import { getCountyBySlug, getStateData, getTownBySlugs } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import { isValidState } from '@/utils/stateUtils'
import type { SeoEntityType } from './types'

export type PathToEntityMatch = {
  matched: true
  normalizedPath: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
}

export type PathToEntityResult = PathToEntityMatch | { matched: false; normalizedPath: string }

/** Reserved first segments after state that are not county slugs */
const STATE_SUBPAGES = new Set(['property-tax-calculator', 'property-tax-rates'])

/**
 * Normalize user/SC input to a lowercase path without trailing slash, query, or hash.
 */
export function normalizeSitePath(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)

  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      s = u.pathname
    }
  } catch {
    return null
  }

  if (!s.startsWith('/')) s = `/${s}`
  const q = s.indexOf('?')
  if (q >= 0) s = s.slice(0, q)
  const h = s.indexOf('#')
  if (h >= 0) s = s.slice(0, h)
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
  return s.toLowerCase()
}

function shortCountySlugFromData(county: { slug?: string | null; name: string }) {
  return county.slug || slugifyLocation(county.name)
}

/**
 * Resolve a normalized path (see {@link normalizeSitePath}) to a known entity.
 */
export function pathToEntity(normalizedPath: string): PathToEntityResult {
  const path = normalizedPath
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return { matched: false, normalizedPath: path }

  const stateSlug = segments[0]!.toLowerCase()
  if (!isValidState(stateSlug)) return { matched: false, normalizedPath: path }

  const stateData = getStateData(stateSlug)
  if (!stateData) return { matched: false, normalizedPath: path }

  if (segments.length === 1) {
    return {
      matched: true,
      normalizedPath: path,
      entityType: 'state',
      stateSlug,
      countySlug: null,
      townSlug: null,
    }
  }

  const seg1 = decodeURIComponent(segments[1]!)

  if (STATE_SUBPAGES.has(seg1.toLowerCase())) {
    return {
      matched: true,
      normalizedPath: path,
      entityType: 'state',
      stateSlug,
      countySlug: null,
      townSlug: null,
    }
  }

  const county = getCountyBySlug(stateData, seg1)
  if (!county) return { matched: false, normalizedPath: path }

  const countyShort = shortCountySlugFromData(county)

  if (segments.length === 2) {
    return {
      matched: true,
      normalizedPath: path,
      entityType: 'county',
      stateSlug,
      countySlug: countyShort,
      townSlug: null,
    }
  }

  const seg2 = decodeURIComponent(segments[2]!)

  if (seg2 === 'towns') {
    return {
      matched: true,
      normalizedPath: path,
      entityType: 'county',
      stateSlug,
      countySlug: countyShort,
      townSlug: null,
    }
  }

  if (seg2 === 'property-tax-calculator') {
    return {
      matched: true,
      normalizedPath: path,
      entityType: 'county',
      stateSlug,
      countySlug: countyShort,
      townSlug: null,
    }
  }

  if (seg2.toLowerCase().endsWith('-property-tax')) {
    const resolved = getTownBySlugs(stateSlug, seg1, seg2)
    if (!resolved) return { matched: false, normalizedPath: path }
    const townShort = resolved.town.slug || slugifyLocation(resolved.town.name)
    return {
      matched: true,
      normalizedPath: path,
      entityType: 'town',
      stateSlug,
      countySlug: countyShort,
      townSlug: townShort,
    }
  }

  return { matched: false, normalizedPath: path }
}
