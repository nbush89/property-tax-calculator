import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { slugifyLocation } from '@/utils/locationUtils'
import { getStateData } from '@/lib/geo'
import {
  getAllCountyRatesFromState,
  getMunicipalRatesByCountyFromState,
  getCountyEffectiveTaxRateYear,
  getTownEffectiveTaxRateYear,
  getMaxEffectiveTaxRateYearInState,
} from '@/lib/rates-from-state'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    return { title: 'State Not Found | Property Tax Calculator' }
  }
  const stateName = formatStateName(state)
  const path = `/${encodeURIComponent(state)}/property-tax-rates`
  return buildMetadata({
    title: `${stateName} Property Tax Rates by County | Tax Rates`,
    description: `View current property tax rates by county and municipality in ${stateName}. Planning estimates only.`,
    path,
    keywords: `${stateName} tax rates, ${stateName} county tax rates, property tax rates by county, ${stateName} municipal tax rates`,
  })
}

export default async function StatePropertyTaxRatesPage({ params }: Props) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    notFound()
  }
  const stateData = getStateData(state)
  if (!stateData) {
    notFound()
  }
  const stateName = stateData.state.name
  const countyRates = getAllCountyRatesFromState(stateData)
  const municipalRatesByCounty = getMunicipalRatesByCountyFromState(stateData)
  const counties = Object.keys(countyRates).sort()
  const hasRates = counties.length > 0
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/property-tax-rates`
  const fallbackYear = stateData.state.asOfYear ?? new Date().getFullYear()
  /** Align UI with actual series: county cards use latest datapoint year, not only state.asOfYear */
  const latestRateYearInState = getMaxEffectiveTaxRateYearInState(stateData) ?? fallbackYear

  const faqs = [
    {
      question: 'What does an effective property tax rate mean?',
      answer:
        'An effective property tax rate is a percentage-based measure used for comparison across places. Your actual bill depends on assessment, exemptions, and local levies.',
    },
    {
      question: 'Why do rates differ across municipalities in the same county?',
      answer:
        'Municipal, school, and special district budgets differ, and assessments and levy needs vary by locality.',
    },
    {
      question: 'Are these rates official?',
      answer:
        'They are based on publicly available sources and labeled by year, but this site provides planning estimates only—verify locally.',
    },
  ]

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: `${SITE_URL}/${state}` },
          { name: 'Property Tax Rates', url: pageUrl },
        ])}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      <Header />
      <main className="min-h-screen bg-page-like-home">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-primary transition-colors underline">
                  Home
                </Link>
              </li>
              <li>·</li>
              <li>
                <Link href={`/${state}`} className="hover:text-primary transition-colors underline">
                  {stateName}
                </Link>
              </li>
              <li>·</li>
              <li className="text-text">Property Tax Rates</li>
            </ol>
          </nav>

          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-text">
              {stateName} Property Tax Rates
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Property tax rates by county and municipality. Years match the latest point in each
              rate series (up to {latestRateYearInState} in this state&apos;s data).
            </p>
            <div className="mt-6 max-w-prose">
              <p className="text-text-muted leading-relaxed">
                Property tax rates in {stateName} vary by county and municipality due to differences
                in local budgets, school funding, and assessment practices. Rates below are labeled
                by year and intended for planning and comparison only—verify details with local
                assessors.
              </p>
            </div>
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-text mb-3">Related resources</h2>
              <ul className="space-y-1 text-sm text-text-muted">
                <li>
                  <Link
                    href={`/${state}`}
                    className="hover:text-primary transition-colors underline"
                  >
                    {stateName} property tax overview
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${state}/property-tax-calculator`}
                    className="hover:text-primary transition-colors underline"
                  >
                    Estimate your {stateName} property taxes
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${state}#counties`}
                    className="hover:text-primary transition-colors underline"
                  >
                    Browse {stateName} counties
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {!hasRates ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center text-text-muted">
              <p>
                County and municipal rate data for {stateName} is being added. Check back soon or
                use the calculator for estimates.
              </p>
              <Link
                href={`/${state}/property-tax-calculator`}
                className="mt-4 inline-block text-primary hover:text-primary-hover underline"
              >
                Go to {stateName} calculator →
              </Link>
            </div>
          ) : (
            <>
              <p className="text-s text-text-muted mb-4">
                Select a county to view its average rate and available municipal rates.
              </p>
              <div className="space-y-8">
                {counties.map(county => {
                  const countyRate = countyRates[county]
                  const countyData = municipalRatesByCounty[county]
                  const countyRateYear =
                    getCountyEffectiveTaxRateYear(stateData, county) ?? fallbackYear
                  return (
                    <div
                      key={county}
                      className="rounded-lg border border-border bg-surface shadow-sm"
                    >
                      <div className="border-b border-border bg-bg px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-semibold text-text">
                              <Link
                                href={`/${state}/${slugifyLocation(county)}-county-property-tax`}
                                className="hover:text-primary transition-colors"
                              >
                                {county} County
                              </Link>
                            </h2>
                            {countyRate != null && (
                              <p className="mt-1 text-sm text-text-muted">
                                County Rate: {(countyRate * 100).toFixed(2)}% (tax year{' '}
                                {countyRateYear})
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/${state}/${slugifyLocation(county)}-county-property-tax`}
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
                                const townYear =
                                  getTownEffectiveTaxRateYear(stateData, county, municipality) ??
                                  countyRateYear
                                return (
                                  <Link
                                    key={municipality}
                                    href={`/${state}/${countySlug}/${townSlug}-property-tax`}
                                    className="rounded border border-border bg-bg p-3 hover:border-primary hover:bg-primary-soft/50 transition-colors block"
                                  >
                                    <p className="font-medium text-text hover:text-primary">
                                      {municipality}
                                    </p>
                                    <p className="mt-1 text-sm text-text-muted">
                                      {(rate * 100).toFixed(2)}% ({townYear})
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
            </>
          )}

          <div className="mt-12 rounded-lg border border-info/30 bg-info/10 p-6">
            <p className="text-sm text-text">
              <strong className="font-semibold">Note:</strong> These rates are estimates based on
              available data. Actual rates may vary. Always verify with your local tax assessor for
              official rates.
            </p>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-text mb-6">FAQ</h2>
            <dl className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index}>
                  <dt className="text-lg font-semibold text-text mb-2">{faq.question}</dt>
                  <dd className="text-text-muted leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>

          {state === 'new-jersey' && (
            <div className="mt-12 pt-8 border-t border-border">
              <h2 className="text-lg font-semibold text-text mb-2">Sources</h2>
              <p className="text-sm text-text-muted">
                Sources: New Jersey Division of Taxation (municipal/county tax rate publications),
                U.S. Census Bureau (where noted).
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
