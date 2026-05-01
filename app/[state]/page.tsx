import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStateData } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import { selectStateFeaturedTowns } from '@/lib/links/towns'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'
import { getStatePageFaqData } from '@/data/statePageFaqData'
import { LinkButton } from '@/components/ui/Button'
import { CtaCalculateLink } from '@/components/cta/CtaCalculateLink'
import { StateReliefSection } from '@/components/relief/StateReliefSection'
import TopCountiesTable from '@/components/state/TopCountiesTable'
import ChoroplethMap from '@/components/state/ChoroplethMap'
import type { CountyRateData } from '@/components/state/ChoroplethMap'
import { getLatestValue } from '@/lib/data/metrics'

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
  const path = `/${encodeURIComponent(state)}`
  return buildMetadata({
    title: `${stateName} Property Tax Calculator & County Guide (Planning Estimates)`,
    description: `Explore ${stateName} property taxes by county and town. Use public data for planning estimates and compare local tax trends.`,
    path,
    keywords: `${stateName} property tax, ${stateName} property tax by county, ${stateName} county taxes, ${stateName} property tax calculator`,
  })
}

export default async function StatePage({ params }: Props) {
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
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}`

  const faqs = getStatePageFaqData(state)

  // State-level summary stats for hero
  const stateAvgRate = getLatestValue(stateData.metrics?.averageTaxRate)
  const countyCount = stateData.counties.length

  // Build county data for map + stats
  const countyMapData: CountyRateData[] = stateData.counties.map(c => {
    const rateSeries = c.metrics?.effectiveTaxRate ?? []
    const billSeries = c.metrics?.averageResidentialTaxBill ?? []
    return {
      name: c.name,
      slug: c.slug || slugifyLocation(c.name),
      effectiveRatePct: rateSeries.length ? rateSeries[rateSeries.length - 1].value : null,
      avgBill: billSeries.length ? billSeries[billSeries.length - 1].value : null,
    }
  })
  const countyRates = countyMapData
    .map(c => c.effectiveRatePct)
    .filter((v): v is number => v != null)

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: pageUrl },
        ])}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      <Header />
      <main className="min-h-screen bg-bg">
        {/* Compact page header — H1 + stat chips + single CTA */}
        <div className="border-b border-border bg-gradient-to-b from-bg-gradient-from to-bg pb-5 pt-8">
          <div className="container-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  {stateName} Property Tax by County and Town
                </h1>
                {/* Stat chips */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {stateAvgRate != null && (
                    <span className="text-text-muted">
                      Avg rate:{' '}
                      <span className="font-semibold text-text">{stateAvgRate.toFixed(2)}%</span>
                    </span>
                  )}
                  {countyRates.length > 0 && (
                    <>
                      {stateAvgRate != null && <span className="text-border">·</span>}
                      <span className="text-text-muted">
                        Range:{' '}
                        <span className="font-semibold text-text">
                          {Math.min(...countyRates).toFixed(2)}%–{Math.max(...countyRates).toFixed(2)}%
                        </span>
                      </span>
                    </>
                  )}
                  <span className="text-border">·</span>
                  <span className="text-text-muted">
                    <span className="font-semibold text-text">{countyCount}</span> counties
                  </span>
                  <span className="text-border">·</span>
                  <span className="text-xs text-text-muted">Planning estimates only</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <CtaCalculateLink
                  href={`/${state}/property-tax-calculator`}
                  variant="primary"
                  size="sm"
                  pageType="state"
                  state={state}
                >
                  Estimate my {stateData.state.abbreviation} tax
                </CtaCalculateLink>
                <LinkButton
                  href={`/${state}/property-tax-appeal-calculator`}
                  variant="secondary"
                  size="sm"
                >
                  Am I over-assessed?
                </LinkButton>
              </div>
            </div>
          </div>
        </div>

        {/* Map + county table */}
        <section className="pt-8 pb-10 bg-bg">
          <div className="container-page">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              {/* Left: choropleth map */}
              <div>
                <h2 className="text-xl font-semibold text-text mb-1">
                  {stateName} effective tax rates by county
                </h2>
                <p className="text-sm text-text-muted mb-4">
                  Click a county to view rates, trends, and town-level data.
                </p>
                <ChoroplethMap
                  stateSlug={state}
                  counties={countyMapData}
                  height={state === 'texas' ? 480 : 420}
                />
              </div>
              {/* Right: sortable county table */}
              <div>
                <TopCountiesTable stateSlug={state} stateName={stateName} />
              </div>
            </div>
          </div>
        </section>

        {/* Featured towns — direct links to published town pages */}
        {(() => {
          const featuredTowns = selectStateFeaturedTowns(stateData, { max: 15 })
          if (featuredTowns.length === 0) return null
          return (
            <section className="border-t border-border py-8 bg-bg">
              <div className="container-page">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-text">Browse towns</h2>
                  <Link
                    href={`/${state}/property-tax-rates`}
                    className="text-sm text-primary hover:text-primary-hover"
                  >
                    Full rates table →
                  </Link>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                  {featuredTowns.map(({ name, href, countyName }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        {name}
                      </Link>
                      <p className="text-xs text-text-muted">{countyName} Co.</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )
        })()}

        {/* State relief programs */}
        <section className="border-t border-border py-8 bg-bg">
          <div className="container-page">
            <StateReliefSection stateSlug={state} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
