'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

type TownPageTrackerProps = {
  county: string
  town: string
  tier?: string
}

/**
 * Fires view_town_page when the town page is viewed (client-side).
 * Mount from a server-rendered town page; keeps the page SSR.
 */
export function TownPageTracker({ county, town, tier }: TownPageTrackerProps) {
  useEffect(() => {
    const tierValue = tier === 'tier1' || tier === 'tier2' || tier === 'tier3' ? tier : undefined
    trackEvent('view_town_page', {
      page_type: 'town',
      ...(tierValue && { tier: tierValue }),
      state: 'NJ',
      county,
      town,
    })
  }, [county, town, tier])

  return null
}
