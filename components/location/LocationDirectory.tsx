import Link from 'next/link'
import { getNewJerseyCounties } from '@/utils/stateData'
import { slugifyLocation } from '@/utils/locationUtils'
import { Card } from '@/components/ui/Card'

/**
 * Location directory component - displays counties with links to county pages
 */
export default function LocationDirectory() {
  const counties = getNewJerseyCounties()

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold text-text mb-6">Browse by County</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {counties.map(county => (
          <Link
            key={county.slug}
            href={`/new-jersey/${slugifyLocation(county.name)}-county-property-tax`}
            className="block"
          >
            <Card className="p-4 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors h-full">
              <h3 className="font-semibold text-text mb-1">{county.name}</h3>
              <p className="text-sm text-text-muted">
                {county.towns?.length || 0} {(county.towns?.length || 0) === 1 ? 'town' : 'towns'}
              </p>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-text-muted text-center">
        Click any county to view detailed property tax information, rates, and calculator for that
        location.
      </p>
    </div>
  )
}
