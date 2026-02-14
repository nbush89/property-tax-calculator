'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

type TownPageTrackerProps = {
  countySlug: string
  townSlug: string
  tier?: string
}

/**
 * Fires view_town_page when the town page is viewed (client-side).
 * Uses slugs for segmentation (not display names). Mount from server-rendered town page.
 */
export function TownPageTracker({ countySlug, townSlug, tier }: TownPageTrackerProps) {
  useEffect(() => {
    const tierValue = tier === 'tier1' || tier === 'tier2' || tier === 'tier3' ? tier : undefined
    trackEvent('view_town_page', {
      page_type: 'town',
      state: 'NJ',
      county: countySlug,
      town: townSlug,
      ...(tierValue && { tier: tierValue }),
    })
  }, [countySlug, townSlug, tier])

  return null
}
