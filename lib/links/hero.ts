/**
 * Helpers for hero / neutral landing CTAs.
 * Builds URLs to the primary multi-state calculator with optional query params.
 */

import { slugifyLocation, removeCountySuffix } from '@/utils/locationUtils'

/**
 * Build href to the primary calculator with query params for prefill.
 * Use for homepage hero and any deep link into the calculator.
 */
export function buildCalculatorHref(params: {
  stateSlug?: string
  countySlug?: string
  townSlug?: string
  homeValue?: string
}): string {
  const { stateSlug, countySlug, townSlug, homeValue } = params
  const search = new URLSearchParams()
  if (stateSlug?.trim()) search.set('state', stateSlug.trim().toLowerCase())
  if (countySlug?.trim()) search.set('county', countySlug.trim())
  if (townSlug?.trim()) search.set('town', townSlug.trim())
  if (homeValue?.trim()) search.set('homeValue', homeValue.trim())
  const qs = search.toString()
  return `/property-tax-calculator${qs ? `?${qs}` : ''}`
}

/**
 * @deprecated Use buildCalculatorHref for hero/form links so users land on the full calculator.
 * Kept for any legacy links that need the same URL shape.
 */
export function buildHeroCalculatorHref(
  stateSlug: string,
  countyName?: string,
  townSlug?: string
): string {
  const countySlug =
    countyName != null
      ? removeCountySuffix(slugifyLocation(countyName)).replace(/-county-property-tax$/, '')
      : undefined
  return buildCalculatorHref({ stateSlug, countySlug, townSlug })
}
