import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { Card } from '@/components/ui/Card'
import LocationFAQ from '@/components/location/LocationFAQ'
import { getStateData, getCountyBySlug } from '@/lib/geo'
import { getCountyNames, getMunicipalitiesByCountyMap, getCountyRate } from '@/lib/rates-from-state'
import { isValidState } from '@/utils/stateUtils'
import { getCountyFaqData } from '@/data/countyFaqData'
import CountyTaxTrendsChart from '@/components/CountyTaxTrendsChart'
import {
  getCountyHeroHighlight,
  formatResolvedMetricValue,
  shouldShowCountyAverageTaxBillTrend,
} from '@/lib/metrics/resolveDisplayMetrics'
import { MetricCaveatTrigger } from '@/components/metrics/MetricCaveatTrigger'
import {
  selectFeaturedTowns,
  buildCountyTownsIndexHref,
  getTownSlug,
  isTownReady,
  getCountyShortSlug,
  buildComparisonHref,
} from '@/lib/links/towns'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { resolveCountyPageContent } from '@/lib/content/countyContent'
import {
  CountyOverviewSection,
  CountyComparisonSection,
  CountyTaxFactorsSection,
  CountyRelatedCountiesSection,
} from '@/components/county/CountyPageSections'
import { CountyReliefSection } from '@/components/relief/CountyReliefSection'
import ChoroplethMap from '@/components/state/ChoroplethMap'
import type { CountyRateData } from '@/components/state/ChoroplethMap'
import { slugifyLocation } from '@/utils/locationUtils'
import { CtaCalculateLink } from '@/components/cta/CtaCalculateLink'
import { LinkButton } from '@/components/ui/Button'

type Props = {
  params: Promise<{ state: string; county: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countySlug } = await params
  const state = decodeURIComponent(stateParam)
  const normalizedSlug = countySlug.replace(/-county-property-tax$/, '')
  if (!isValidState(state)) return { title: 'State Not Found | Property Tax Calculator' }
  const stateData = getStateData(state)
  if (!stateData) return { title: 'State Not Found | Property Tax Calculator' }
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) return { title: 'County Not Found | Property Tax Calculator' }

  const stateName = stateData.state.name
  const path = `/${encodeURIComponent(state)}/${countySlug}`
  const hero = getCountyHeroHighlight(state, county.metrics)
  const heroYear = hero?.latestPoint?.year
  const yearLabel = heroYear != null ? ` (${heroYear})` : ''
  const heroTitlePart = hero?.show
    ? `${hero.catalog.shortLabel ?? hero.catalog.label}${yearLabel}`
    : 'Property tax calculator'
  const heroValuePart = hero?.show ? formatResolvedMetricValue(hero) : ''

  return buildMetadata({
    title: hero?.show
      ? `${county.name} County, ${stateData.state.abbreviation} Property Tax: ${heroValuePart} ${heroTitlePart}`
      : `${county.name} County, ${stateData.state.abbreviation} Property Tax Rates, Trends & Calculator`,
    description: `${county.name} County, ${stateName} property tax rates, trends, and town comparisons.${hero?.show ? ` ${hero.catalog.label}${yearLabel}: ${heroValuePart}.` : ''} Compare towns and estimate your annual bill.`,
    path,
    keywords: `${county.name} County property tax rate, ${county.name} County ${stateData.state.abbreviation} property tax, ${stateName} ${county.name} County tax calculator, ${county.name} County property tax appeal`,
    openGraph: {
      title: `${county.name} County, ${stateData.state.abbreviation} Property Tax: Rates, Trends & Town Comparisons`,
      description: `${county.name} County, ${stateName} property tax rates, trends, and town comparisons.${hero?.show ? ` ${hero.catalog.label}${yearLabel}: ${heroValuePart}.` : ''}`,
      type: 'website',
    },
  })
}

export default async function CountyPropertyTaxPage({ params }: Props) {
  const { state: stateParam, county: countySlug } = await params
  const state = decodeURIComponent(stateParam)
  const normalizedSlug = countySlug.replace(/-county-property-tax$/, '')
  if (!isValidState(state)) notFound()
  const stateData = getStateData(state)
  if (!stateData) notFound()
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) notFound()

  const stateName = stateData.state.name
  const encState = encodeURIComponent(state)
  const pageUrl = `${SITE_URL}/${encState}/${countySlug}`
  const faqs = getCountyFaqData(county.name, state)
  const { content: countyContent, countyHero } = resolveCountyPageContent({
    stateSlug: state,
    stateData,
    county,
  })
  const countyHeroYear = countyHero?.latestPoint?.year
  const countyHeroValue = countyHero?.show ? formatResolvedMetricValue(countyHero) : null

  const countyEffectiveRate = getCountyRate(stateData, county.name)
  const readyTownCount = (county.towns ?? []).filter(t => isTownReady(t)).length
  const countySlugShort = county.slug || slugifyLocation(county.name)

  // Determine whether to show the bill trend chart (NJ yes, TX no)
  const hasBillTrendData =
    shouldShowCountyAverageTaxBillTrend(state) &&
    (county.metrics?.averageResidentialTaxBill ?? []).length >= 2

  // Build county rate data for the inset map (used when no trend chart)
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

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: `${SITE_URL}/${encState}` },
          { name: `${county.name} County`, url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Estimate property taxes in ${county.name} County, ${stateName}.${countyHero?.show ? ` ${countyHero.catalog.label}${countyHeroYear != null ? ` (${countyHeroYear})` : ''}: ${countyHeroValue}.` : ''}`,
        })}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      <Header />
      <main className="min-h-screen bg-bg">

        {/* Compact page header */}
        <div className="page-header-bar">
          <div className="container-page">
            {/* Breadcrumb */}
            <nav className="text-sm text-text-muted mb-3" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">→</span>
              <Link href={`/${state}`} className="hover:text-primary transition-colors">{stateName}</Link>
              <span className="mx-2">→</span>
              <span className="text-text">{county.name} County</span>
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  {county.name} County, {stateData.state.abbreviation} Property Tax
                </h1>
                {/* Inline stat chips */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {countyHero?.show && (
                    <span className="text-text-muted">
                      {countyHero.catalog.shortLabel ?? countyHero.catalog.label}:{' '}
                      <span className="font-semibold text-text">{countyHeroValue}</span>
                      {countyHeroYear != null && (
                        <span className="text-text-muted"> ({countyHeroYear})</span>
                      )}
                      {' '}<MetricCaveatTrigger
                        semantics={countyHero.semantics}
                        comparability={countyHero.comparability}
                        note={countyHero.note}
                        catalogCaveat={countyHero.catalog.defaultCaveat}
                      />
                    </span>
                  )}
                  {countyEffectiveRate != null && countyHero?.key !== 'effectiveTaxRate' && (
                    <>
                      {countyHero?.show && <span className="text-border">·</span>}
                      <span className="text-text-muted">
                        Rate:{' '}
                        <span className="font-semibold text-text">
                          {(countyEffectiveRate * 100).toFixed(2)}%
                        </span>
                      </span>
                    </>
                  )}
                  {readyTownCount > 0 && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-text-muted">
                        <span className="font-semibold text-text">{readyTownCount}</span>{' '}
                        {readyTownCount === 1 ? 'town' : 'towns'} covered
                      </span>
                    </>
                  )}
                  <span className="text-border">·</span>
                  <span className="text-xs text-text-muted">Planning estimates only</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <CtaCalculateLink
                  href={`/${state}/property-tax-calculator`}
                  variant="primary"
                  size="sm"
                  pageType="county"
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

        {/* Data hero — adapts to available data */}
        <section className="pt-8 pb-2 bg-bg">
          <div className="container-page">
            {hasBillTrendData ? (
              /* NJ-style: full-width bill trend chart */
              <CountyTaxTrendsChart county={county} stateSlug={state} />
            ) : (
              /* TX-style: key stats left + inset map right */
              <div className="grid gap-6 lg:grid-cols-3 lg:items-start mb-10">
                <div className="flex flex-col gap-3">
                  {countyHero?.show && (
                    <div className="rounded-lg border border-border bg-surface p-5">
                      <p className="text-sm text-text-muted mb-1">
                        {countyHero.catalog.label}
                        {countyHeroYear != null && (
                          <span> ({countyHeroYear})</span>
                        )}
                      </p>
                      <p className="text-3xl font-bold text-text">{countyHeroValue}</p>
                    </div>
                  )}
                  {countyEffectiveRate != null && countyHero?.key !== 'effectiveTaxRate' && (
                    <div className="rounded-lg border border-border bg-surface p-5">
                      <p className="text-sm text-text-muted mb-1">Effective Tax Rate</p>
                      <p className="text-3xl font-bold text-text">
                        {(countyEffectiveRate * 100).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {readyTownCount > 0 && (
                    <div className="rounded-lg border border-border bg-surface p-5">
                      <p className="text-sm text-text-muted mb-1">Towns covered</p>
                      <p className="text-3xl font-bold text-text">{readyTownCount}</p>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <p className="text-sm font-medium text-text-muted mb-2">
                    {county.name} County in {stateName}
                  </p>
                  <ChoroplethMap
                    stateSlug={state}
                    counties={countyMapData}
                    highlightSlug={countySlugShort}
                    height={300}
                    showLegend={true}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Calculator */}
        <section className="border-t border-border py-8 bg-bg">
          <div className="container-page">
            <h2 className="text-xl font-semibold text-text mb-5">
              Calculate Your {county.name} County Property Tax
            </h2>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <TaxForm
                  stateSlug={state}
                  defaultCounty={county.name}
                  countyNames={getCountyNames(stateData)}
                  municipalitiesByCounty={getMunicipalitiesByCountyMap(stateData)}
                />
              </Card>
              <Card className="p-6">
                <TaxResults stateSlug={state} />
              </Card>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Planning estimates only — actual taxes depend on official assessments, exemptions, and published rates for your municipality.
            </p>
          </div>
        </section>

        {/* Towns section */}
        {(() => {
          const featuredTowns = selectFeaturedTowns(county, { max: 8, stateSlug: state })
          const townsIndexHref = buildCountyTownsIndexHref(state, countySlug)
          const publishedCount = (county.towns || []).filter(
            t => getTownSlug(t) && isTownPublished(t)
          ).length
          const insights = countyContent.townInsights
          if (featuredTowns.length === 0 && publishedCount === 0 && !insights?.highlights?.length) {
            return null
          }
          return (
            <section className="border-t border-border py-8 bg-bg" id="compare-towns">
              <div className="container-page">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-4">
                  <h2 className="text-xl font-semibold text-text">
                    {insights?.title ?? `Towns in ${county.name} County`}
                  </h2>
                  {publishedCount > 0 && (
                    <Link
                      href={townsIndexHref}
                      className="text-sm text-primary hover:text-primary-hover"
                    >
                      Browse all {publishedCount} towns →
                    </Link>
                  )}
                </div>
                {insights?.intro && (
                  <p className="text-sm text-text-muted mb-4">{insights.intro}</p>
                )}
                {insights?.highlights?.map((h, i) => (
                  <p key={i} className="text-sm text-text-muted mb-3 border-l-2 border-border pl-3">
                    {h}
                  </p>
                ))}
                {featuredTowns.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                    {featuredTowns.map(t => (
                      <Link
                        key={t.href}
                        href={t.href}
                        className="block p-3 bg-surface border border-border rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        <span className="font-medium text-sm text-primary">{t.name}</span>
                        <span className="block text-xs text-text-muted mt-0.5">View rates →</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Compare pairs */}
                {(() => {
                  const countyShortSlug = getCountyShortSlug(county)
                  const readyTowns = (county.towns ?? []).filter(
                    t => getTownSlug(t) && isTownReady(t)
                  )
                  if (readyTowns.length < 2) return null
                  const top = readyTowns.slice(0, 5)
                  const pairs: { nameA: string; nameB: string; href: string }[] = []
                  for (let i = 0; i < top.length && pairs.length < 6; i++) {
                    for (let j = i + 1; j < top.length && pairs.length < 6; j++) {
                      pairs.push({
                        nameA: top[i].displayName ?? top[i].name,
                        nameB: top[j].displayName ?? top[j].name,
                        href: buildComparisonHref(
                          state,
                          countyShortSlug,
                          getTownSlug(top[i]),
                          getTownSlug(top[j])
                        ),
                      })
                    }
                  }
                  if (pairs.length === 0) return null
                  return (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-text mb-2">Compare towns</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {pairs.map(p => (
                          <Link
                            key={p.href}
                            href={p.href}
                            className="text-sm data-link"
                          >
                            {p.nameA} vs {p.nameB}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </section>
          )
        })()}

        {/* Overview + content sections */}
        <section className="border-t border-border py-8 bg-bg">
          <div className="container-page">
            <CountyOverviewSection overview={countyContent.overview} />
            {countyContent.comparison && (
              <CountyComparisonSection comparison={countyContent.comparison} />
            )}
            <CountyTaxFactorsSection taxFactors={countyContent.taxFactors} />
          </div>
        </section>

        {/* Relief programs */}
        <section className="border-t border-border py-8 bg-bg">
          <div className="container-page">
            <CountyReliefSection stateSlug={state} countyDisplayName={county.name} />
          </div>
        </section>

        {/* Related counties + FAQ */}
        <section className="border-t border-border py-8 bg-bg">
          <div className="container-page">
            {countyContent.relatedCounties && (
              <div className="mb-8">
                <CountyRelatedCountiesSection relatedCounties={countyContent.relatedCounties} />
              </div>
            )}
            <LocationFAQ
              faqs={faqs}
              title={`${county.name} County Property Tax FAQ`}
              subtitle="Common questions about property taxes in this county"
            />
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
