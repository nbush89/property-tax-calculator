import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { getAvailableStates } from '@/lib/geo'
import { SITE_URL } from '@/lib/site'
import { Card } from '@/components/ui/Card'

export const metadata: Metadata = buildMetadata({
  title: 'Property Tax Rates by State | County & Municipal Tax Rates',
  description:
    'Browse property tax rates by state. View county and municipal rates for accurate planning. Available states expand as data is published.',
  path: '/property-tax-rates',
  keywords:
    'property tax rates by state, county tax rates, municipal tax rates, property tax comparison',
})

export default function PropertyTaxRatesLandingPage() {
  const states = getAvailableStates()
  const pageUrl = `${SITE_URL}/property-tax-rates`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Property Tax Rates', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="container-page py-12">
          <div className="mb-10 text-center">
            <h1 className="section-title mb-4">Property Tax Rates by State</h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Choose a state to view county and municipal property tax rates. Available states
              expand over time as data is published.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {states.map(state => (
              <Link
                key={state.slug}
                href={`/${state.slug}/property-tax-rates`}
                className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
              >
                <Card className="p-6 hover:border-primary/50 transition-colors h-full">
                  <h2 className="text-lg font-semibold text-text">{state.name}</h2>
                  <p className="mt-2 text-sm text-text-muted">
                    View county and municipal property tax rates →
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
