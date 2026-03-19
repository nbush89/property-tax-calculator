'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

type TownPageTrackerProps = {
  countySlug: string
  townSlug: string
  /** Two-letter or short code for analytics (e.g. NJ, TX). */
  stateCode?: string
  tier?: string
}

/**
 * Fires view_town_page when the town page is viewed (client-side).
 * Uses slugs for segmentation (not display names). Mount from server-rendered town page.
 */
export function TownPageTracker({
  countySlug,
  townSlug,
  stateCode = 'NJ',
  tier,
}: TownPageTrackerProps) {
  useEffect(() => {
    const tierValue = tier === 'tier1' || tier === 'tier2' || tier === 'tier3' ? tier : undefined
    trackEvent('view_town_page', {
      page_type: 'town',
      state: stateCode,
      county: countySlug,
      town: townSlug,
      ...(tierValue && { tier: tierValue }),
    })
  }, [countySlug, townSlug, tier, stateCode])

  return null
}
