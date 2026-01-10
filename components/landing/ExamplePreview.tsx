import Section from '@/components/ui/Section'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Link from 'next/link'

export default function ExamplePreview() {
  return (
    <Section
      title="Explore County & Town Pages"
      subtitle="Dive deeper into local property tax context and trends"
    >
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Feature Card 1 */}
        <Card className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-text">County & town pages</h3>
          <p className="text-sm text-text-muted">
            Browse detailed property tax information for all 21 New Jersey counties and explore
            town-level data where available.
          </p>
        </Card>

        {/* Feature Card 2 */}
        <Card className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-text">Year-aware trends</h3>
          <p className="text-sm text-text-muted">
            View historical property tax trends with clear year labels, helping you understand how
            taxes have changed over time.
          </p>
        </Card>

        {/* Feature Card 3 */}
        <Card className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-text">Transparent methodology</h3>
          <p className="text-sm text-text-muted">
            Every estimate includes source attribution and year labels. See our{' '}
            <Link href="/methodology" className="text-primary hover:text-primary-hover underline">
              methodology
            </Link>{' '}
            for details on data sources and calculations.
          </p>
        </Card>
      </div>
    </Section>
  )
}
