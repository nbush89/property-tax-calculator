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
  description: 'View current property tax rates for all 21 counties in New Jersey. Find county and municipal tax rates for accurate property tax estimates.',
  path: '/new-jersey/property-tax-rates',
  keywords: 'New Jersey tax rates, NJ county tax rates, property tax rates by county, New Jersey municipal tax rates',
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
      <main className="min-h-screen bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              New Jersey Property Tax Rates
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Current property tax rates by county and municipality
            </p>
          </div>

          <div className="space-y-8">
            {counties.map((county) => {
              const countyRate = countyRates[county]
              const countyData = njMunicipalRates[county as keyof typeof njMunicipalRates]

              return (
                <div
                  key={county}
                  className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                          <Link
                            href={`/new-jersey/${slugifyLocation(county)}-county-property-tax`}
                            className="hover:text-primary transition-colors"
                          >
                            {county} County
                          </Link>
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                                className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors block"
                              >
                                <p className="font-medium text-slate-900 dark:text-white hover:text-primary">
                                  {municipality}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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

          <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> These rates are estimates based on available data. Actual rates may vary. Always verify with your local tax assessor for official rates.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

