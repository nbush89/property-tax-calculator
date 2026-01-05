/**
 * Component to display popular towns in a county with internal links
 * Only renders if town pages are enabled and ready towns exist
 */

import Link from 'next/link'
import type { CountyData } from '@/lib/data/types'
import { selectCountyTownLinks } from '@/lib/links/towns'

interface CountyTownLinksProps {
  county: CountyData
}

/**
 * CountyTownLinks component
 * Renders a section with links to popular towns in the county
 */
export default function CountyTownLinks({ county }: CountyTownLinksProps) {
  // Feature flag: only show links if town pages are enabled
  const townPagesEnabled = process.env.NEXT_PUBLIC_TOWN_PAGES_ENABLED === 'true'

  if (!townPagesEnabled) {
    return null
  }

  const townLinks = selectCountyTownLinks(county, { max: 3 })

  if (townLinks.length === 0) {
    return null
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold mb-4 text-text">
        Popular towns in {county.name} County
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Explore property tax information for specific municipalities in {county.name} County.
      </p>
      <div className="flex flex-wrap gap-4">
        {townLinks.map(town => (
          <Link
            key={town.href}
            href={town.href}
            className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
          >
            {town.name} property tax calculator
          </Link>
        ))}
      </div>
    </div>
  )
}
