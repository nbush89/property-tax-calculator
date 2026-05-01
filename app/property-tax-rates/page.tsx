import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { getAvailableStates, getStateData } from '@/lib/geo'
import { SITE_URL } from '@/lib/site'
import { getLatestValue } from '@/lib/data/metrics'

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

  // Enrich each state with summary metrics
  const stateRows = states.map(s => {
    const data = getStateData(s.slug)
    const avgRate = data ? getLatestValue(data.metrics?.averageTaxRate) : null
    const countyCount = data?.counties.length ?? 0
    const townCount = data?.counties.reduce((sum, c) => sum + (c.towns?.length ?? 0), 0) ?? 0
    return { ...s, avgRate, countyCount, townCount }
  })

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

        {/* Compact page header */}
        <div className="page-header-bar">
          <div className="container-page">
            <nav className="text-sm text-text-muted mb-3" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">→</span>
              <span className="text-text">Property Tax Rates</span>
            </nav>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  Property Tax Rates by State
                </h1>
                <p className="mt-1 text-sm text-text-muted">
                  County and municipal effective rates by state. Select a state to explore counties and towns.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* State table */}
        <section className="pt-8 pb-10 bg-bg">
          <div className="container-page">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left">
                    <th className="px-4 py-3 font-medium text-text-muted">State</th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted whitespace-nowrap">
                      Avg Rate
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted">Counties</th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted">Towns</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {stateRows.map((state, i) => (
                    <tr
                      key={state.slug}
                      className={`border-b border-border last:border-0 transition-colors hover:bg-primary/5 ${
                        i % 2 === 0 ? 'bg-bg' : 'bg-surface/30'
                      }`}
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/${state.slug}/property-tax-rates`}
                          className="font-medium text-primary hover:text-primary-hover transition-colors"
                        >
                          {state.name}
                        </Link>
                        <div className="mt-0.5 flex gap-3 text-xs text-text-muted">
                          <Link href={`/${state.slug}`} className="hover:text-primary transition-colors">
                            State overview →
                          </Link>
                          <Link href={`/${state.slug}/property-tax-calculator`} className="hover:text-primary transition-colors">
                            Calculator →
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-text">
                        {state.avgRate != null ? (
                          <span className="font-medium">{state.avgRate.toFixed(2)}%</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-text">
                        {state.countyCount > 0 ? state.countyCount : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-text">
                        {state.townCount > 0 ? state.townCount.toLocaleString('en-US') : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/${state.slug}/property-tax-rates`}
                          className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap"
                        >
                          View rates →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-xs text-text-muted border-t border-border">
                Available states expand over time as data is published. Planning estimates only.
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
