import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { getAllCountyRates } from '@/utils/getCountyRates'
import njMunicipalRates from '@/data/nj_municipal_rates.json'
import { SITE_URL } from '@/lib/site'
import { slugifyLocation } from '@/utils/locationUtils'

/**
 * New Jersey property tax rates page.
 * Includes: BreadcrumbList schema.
 */
export const metadata = buildMetadata({
  title: 'New Jersey Property Tax Rates by County | NJ Tax Rates',
  description:
    'View current property tax rates for all 21 counties in New Jersey. Find county and municipal tax rates for accurate property tax estimates.',
  path: '/new-jersey/property-tax-rates',
  keywords:
    'New Jersey tax rates, NJ county tax rates, property tax rates by county, New Jersey municipal tax rates',
})

export default function PropertyTaxRatesPage() {
  const countyRates = getAllCountyRates()
  const counties = Object.keys(countyRates).sort()
  const pageUrl = `${SITE_URL}/new-jersey/property-tax-rates`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey` },
          { name: 'Property Tax Rates', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-primary transition-colors underline">
                  Home
                </Link>
              </li>
              <li>·</li>
              <li>
                <Link href="/new-jersey" className="hover:text-primary transition-colors underline">
                  New Jersey
                </Link>
              </li>
              <li>·</li>
              <li className="text-text">Property Tax Rates</li>
            </ol>
          </nav>

          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-text">
              New Jersey Property Tax Rates
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Current property tax rates by county and municipality
            </p>
            {/* Back Links */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <Link
                href="/new-jersey"
                className="text-text-muted hover:text-primary transition-colors underline"
              >
                Back to New Jersey overview
              </Link>
              <span className="text-text-muted">·</span>
              <Link
                href="/new-jersey#counties"
                className="text-text-muted hover:text-primary transition-colors underline"
              >
                Browse counties
              </Link>
            </div>
          </div>

          <div className="space-y-8">
            {counties.map(county => {
              const countyRate = countyRates[county]
              const countyData = njMunicipalRates[county as keyof typeof njMunicipalRates]

              return (
                <div key={county} className="rounded-lg border border-border bg-surface shadow-sm">
                  <div className="border-b border-border bg-bg px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-text">
                          <Link
                            href={`/new-jersey/${slugifyLocation(county)}-county-property-tax`}
                            className="hover:text-primary transition-colors"
                          >
                            {county} County
                          </Link>
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                          County Rate: {(countyRate * 100).toFixed(2)}%
                        </p>
                      </div>
                      <Link
                        href={`/new-jersey/${slugifyLocation(county)}-county-property-tax`}
                        className="text-sm text-primary hover:text-primary-hover font-medium"
                      >
                        View County Page →
                      </Link>
                    </div>
                  </div>

                  {countyData && Object.keys(countyData).length > 0 && (
                    <div className="px-6 py-4">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Municipal Rates
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(countyData)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([municipality, rate]) => {
                            const countySlug = slugifyLocation(county)
                            const townSlug = slugifyLocation(municipality)
                            return (
                              <Link
                                key={municipality}
                                href={`/new-jersey/${countySlug}/${townSlug}-property-tax`}
                                className="rounded border border-border bg-bg p-3 hover:border-primary hover:bg-primary-soft/50 transition-colors block"
                              >
                                <p className="font-medium text-text hover:text-primary">
                                  {municipality}
                                </p>
                                <p className="mt-1 text-sm text-text-muted">
                                  {(rate * 100).toFixed(2)}%
                                </p>
                              </Link>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-12 rounded-lg border border-info/30 bg-info/10 p-6">
            <p className="text-sm text-text">
              <strong className="font-semibold">Note:</strong> These rates are estimates based on
              available data. Actual rates may vary. Always verify with your local tax assessor for
              official rates.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
