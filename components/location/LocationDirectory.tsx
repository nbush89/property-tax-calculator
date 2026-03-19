import Link from 'next/link'
import { getStateData, getAvailableStates } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import { Card } from '@/components/ui/Card'

/**
 * Location directory — counties grouped by state (all states in the registry).
 */
export default function LocationDirectory() {
  const states = getAvailableStates()

  return (
    <div className="mt-12 space-y-12">
      {states.map(({ slug, name }) => {
        const stateData = getStateData(slug)
        if (!stateData?.counties?.length) return null
        return (
          <section key={slug}>
            <h2 className="text-2xl font-semibold text-text mb-2">{name}</h2>
            <p className="text-sm text-text-muted mb-6">Browse by county</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {stateData.counties.map(county => (
                <Link
                  key={`${slug}-${county.slug}`}
                  href={`/${slug}/${slugifyLocation(county.name)}-county-property-tax`}
                  className="block"
                >
                  <Card className="p-4 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors h-full">
                    <h3 className="font-semibold text-text mb-1">{county.name}</h3>
                    <p className="text-sm text-text-muted">
                      {county.towns?.length || 0}{' '}
                      {(county.towns?.length || 0) === 1 ? 'town' : 'towns'}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
      <p className="text-sm text-text-muted text-center">
        Click any county to view detailed property tax information, rates, and calculator for that
        location.
      </p>
    </div>
  )
}
