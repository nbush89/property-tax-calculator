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
import { getStateData, getTownBySlugs } from '@/lib/geo'
import { getCountyNames, getMunicipalitiesByCountyMap } from '@/lib/rates-from-state'
import { slugifyLocation, getTownDisplayName } from '@/utils/locationUtils'
import { selectRelatedTowns, getCountyShortSlug } from '@/lib/links/towns'
import { buildCalculatorHref } from '@/lib/links/hero'
import RelatedTowns from '@/components/location/RelatedTowns'
import { getTownFaqData } from '@/data/townFaqData'
import TownAtAGlance from '@/components/town/TownAtAGlance'
import { TownPageTracker } from '@/components/town/TownPageTracker'
import CalculatorTaxTrendsChart from '@/components/charts/CalculatorTaxTrendsChart'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { isValidState } from '@/utils/stateUtils'
import { resolveTownPageOverview } from '@/lib/town-overview/resolve-page-overview'
import { resolveTownPageSections } from '@/lib/content/townContent'
import { getStateCapabilities } from '@/lib/state-capabilities'

function townSlugForLookup(townSlug: string): string {
  return decodeURIComponent(townSlug).replace(/-property-tax$/, '')
}

type Props = {
  params: Promise<{
    state: string
    county: string
    town: string
  }>
}

/**
 * Town-level property tax page (all registered states).
 * Route: /[state]/[countySlug]/[town]-property-tax
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countySlug, town: townSlug } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    return { title: 'Location Not Found | Property Tax Calculator' }
  }
  if (!countySlug || !townSlug || typeof townSlug !== 'string') {
    return { title: 'Location Not Found | Property Tax Calculator' }
  }

  const result = getTownBySlugs(state, countySlug, townSlug)
  if (!result) {
    return { title: 'Location Not Found | Property Tax Calculator' }
  }

  const { county, town } = result
  const stateData = getStateData(state)!
  const pageOverview = resolveTownPageOverview(town, county, stateData)
  const effectiveRate = getMetricLatest({
    town,
    county,
    metricKey: 'effectiveTaxRate',
  })
  const overview = pageOverview
  const asOfYear =
    overview?.asOfYear ?? effectiveRate?.year ?? town.asOfYear ?? stateData.state.asOfYear
  const rateText =
    overview?.effectiveTaxRatePct != null
      ? `${overview.effectiveTaxRatePct.toFixed(2)}%`
      : effectiveRate
        ? `${effectiveRate.value.toFixed(2)}%`
        : ''
  const avgBillText =
    overview?.avgResidentialTaxBill != null
      ? `Avg tax bill ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(overview.avgResidentialTaxBill)}. `
      : ''
  const titleSuffix =
    rateText || asOfYear
      ? ` (${[asOfYear, rateText].filter(Boolean).join(' · ')} Rates & Estimates)`
      : ''
  const townDisplayName = getTownDisplayName(town)
  const stateName = stateData.state.name
  const abbrev = stateData.state.abbreviation
  const path = `/${encodeURIComponent(state)}/${encodeURIComponent(countySlug)}/${encodeURIComponent(townSlug)}`
  const title = `${townDisplayName}, ${county.name} County ${abbrev} Property Tax Calculator${titleSuffix}`
  const description = `Calculate property taxes for ${townDisplayName}, ${county.name} County, ${stateName}. ${avgBillText}${rateText ? `Effective rate: ${rateText}. ` : ''}Planning estimates with our free calculator.`

  return buildMetadata({
    title,
    description,
    path,
    keywords: `${townDisplayName} property tax, ${townDisplayName} ${county.name} County tax calculator, ${stateName} ${townDisplayName} property tax rate`,
    openGraph: {
      title: title.trim(),
      description,
      type: 'website',
    },
  })
}

export default async function TownPropertyTaxPage({ params }: Props) {
  const { state: stateParam, county: countySlug, town: townSlug } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    notFound()
  }
  if (!countySlug || !townSlug || typeof townSlug !== 'string') {
    notFound()
  }

  const result = getTownBySlugs(state, countySlug, townSlug)
  if (!result) {
    notFound()
  }

  const { county, town } = result
  const townDisplayName = getTownDisplayName(town)
  const stateData = getStateData(state)!
  const stateName = stateData.state.name
  const abbrev = stateData.state.abbreviation
  const countyRouteSegment = `${slugifyLocation(county.name)}-county-property-tax`
  const encState = encodeURIComponent(state)
  const encCountySeg = encodeURIComponent(countySlug)
  const encTownSeg = encodeURIComponent(townSlug)
  const pageUrl = `${SITE_URL}/${encState}/${encCountySeg}/${encTownSeg}`
  const countyPageUrl = `${SITE_URL}/${encState}/${encodeURIComponent(countyRouteSegment)}`
  const countyCalculatorHref = `/${state}/${countyRouteSegment}/property-tax-calculator`
  const relatedTowns = selectRelatedTowns(county, townSlugForLookup(townSlug), {
    max: 6,
    stateSlug: state,
  })

  const pageOverview = resolveTownPageOverview(town, county, stateData)
  const sections = resolveTownPageSections({
    town,
    county,
    stateData,
    townDisplayName,
    overview: pageOverview,
  })

  const effectiveRate = getMetricLatest({
    town,
    county,
    metricKey: 'effectiveTaxRate',
  })
  const taxYearForSources =
    pageOverview?.effectiveTaxRateYear ??
    pageOverview?.asOfYear ??
    effectiveRate?.year ??
    town.asOfYear

  const hasTownAvgBill = Boolean(town.metrics?.averageResidentialTaxBill?.length)
  const hasTownRate = Boolean(town.metrics?.effectiveTaxRate?.length)
  const usesCountyFallback =
    pageOverview != null &&
    ((pageOverview.countyAvgTaxBill != null &&
      pageOverview.avgResidentialTaxBill === pageOverview.countyAvgTaxBill) ||
      (pageOverview.countyEffectiveRatePct != null &&
        pageOverview.effectiveTaxRatePct === pageOverview.countyEffectiveRatePct))

  const faqs = getTownFaqData(town.name, county.name, state, {
    hasTownAvgBillMetric: hasTownAvgBill,
    hasTownRateMetric: hasTownRate,
    usesCountyFallback: Boolean(usesCountyFallback),
  })

  const cap = getStateCapabilities(state)
  const sourcesBlurb = cap.hasComptrollerUnitRates
    ? 'Texas Comptroller–style taxing-unit rates and other public sources where cited.'
    : 'New Jersey Division of Taxation, U.S. Census Bureau, and other public data.'

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: `${SITE_URL}/${encState}` },
          { name: `${county.name} County`, url: countyPageUrl },
          { name: townDisplayName, url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate property taxes for ${townDisplayName}, ${county.name} County, ${stateName}.`,
        })}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      {(town.overview?.provenance?.lastUpdated ??
        (town.overview?.sources?.[0] as { retrieved?: string })?.retrieved) && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            url: pageUrl,
            name: `${townDisplayName}, ${county.name} County ${abbrev} Property Tax Calculator`,
            dateModified:
              town.overview?.provenance?.lastUpdated ??
              (town.overview?.sources?.[0] as { retrieved?: string } | undefined)?.retrieved,
          }}
        />
      )}

      <TownPageTracker
        countySlug={countySlug}
        townSlug={townSlugForLookup(townSlug)}
        stateCode={abbrev}
        tier={town.rollout?.tier != null ? `tier${town.rollout.tier}` : undefined}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container-page py-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-text mb-2">
              {townDisplayName}, {county.name} County {abbrev} Property Tax Calculator
            </h1>
            <p className="text-sm text-text-muted italic">
              Planning estimate (not official tax data)
            </p>
          </div>

          <nav className="text-sm text-text-muted mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">→</span>
            <Link href={`/${state}`} className="hover:text-primary">
              {stateName}
            </Link>
            <span className="mx-2">→</span>
            <Link href={countyPageUrl} className="hover:text-primary">
              {county.name} County
            </Link>
            <span className="mx-2">→</span>
            <span className="text-text">{townDisplayName}</span>
          </nav>

          <nav
            className="mb-6 flex flex-wrap items-center gap-2 text-xs text-text-muted"
            aria-label="Explore calculators"
          >
            <span>Explore:</span>
            <Link
              href={buildCalculatorHref({ stateSlug: state })}
              className="text-text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
            >
              {abbrev} calculator
            </Link>
            <span aria-hidden>·</span>
            <Link
              href={buildCalculatorHref({
                stateSlug: state,
                countySlug: getCountyShortSlug(county),
                townSlug: town.slug || slugifyLocation(town.name),
              })}
              className="text-text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
            >
              Calculator with {townDisplayName} prefilled
            </Link>
          </nav>

          <TownAtAGlance
            townName={townDisplayName}
            countyName={county.name}
            stateCode={abbrev}
            stateSlug={state}
            overview={pageOverview ?? undefined}
          />

          {sections.overviewParagraphs.length > 0 && (
            <section className="mb-10" aria-labelledby="town-overview-heading">
              <h2 id="town-overview-heading" className="text-xl font-semibold text-text mb-3">
                Overview
              </h2>
              <div className="prose prose-lg max-w-none text-text-muted space-y-2">
                {sections.overviewParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {sections.comparison && sections.comparison.items.length > 0 && (
            <section className="mb-10" aria-labelledby="town-compare-heading">
              <h2 id="town-compare-heading" className="text-xl font-semibold text-text mb-3">
                {sections.comparison.title}
              </h2>
              {sections.comparison.summary && (
                <p className="text-sm text-text-muted mb-3">{sections.comparison.summary}</p>
              )}
              <ul className="space-y-2">
                {sections.comparison.items.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted"
                  >
                    <span className="font-medium text-text">{item.label}</span>
                    <p className="mt-1">{item.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-12" aria-labelledby="estimate-heading">
            <h2 id="estimate-heading" className="text-2xl font-semibold mb-4 text-text">
              Estimate property taxes
            </h2>
            <p className="text-text-muted mb-2">
              Use the calculator below with your home value. Estimates are for planning only—verify
              with your local assessor.
            </p>
            <div className="grid lg:grid-cols-2 gap-8 mt-4">
              <Card className="p-6">
                <TaxForm
                  stateSlug={state}
                  defaultCounty={county.name}
                  defaultMunicipality={town.name}
                  countyNames={getCountyNames(stateData)}
                  municipalitiesByCounty={getMunicipalitiesByCountyMap(stateData)}
                />
              </Card>
              <Card className="p-6">
                <TaxResults stateSlug={state} />
              </Card>
            </div>
          </section>

          <section className="mb-10" aria-labelledby="town-estimate-guide-heading">
            <h2 id="town-estimate-guide-heading" className="text-xl font-semibold text-text mb-3">
              {sections.estimateGuide.title}
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-text-muted text-sm">
              {sections.estimateGuide.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {sections.estimateGuide.note && (
              <p className="mt-3 text-sm text-text-muted border-t border-border pt-3">
                {sections.estimateGuide.note}{' '}
                <Link
                  href="/methodology"
                  className="text-primary hover:text-primary-hover underline"
                >
                  Methodology
                </Link>
                .
              </p>
            )}
          </section>

          {relatedTowns.length > 0 && (
            <RelatedTowns
              towns={relatedTowns}
              title={`Explore other towns in ${county.name} County`}
              intro={sections.relatedTownsIntro}
            />
          )}

          {sections.trendChart && (
            <section className="mb-12" aria-labelledby="trends-heading">
              <h2 id="trends-heading" className="text-2xl font-semibold mb-4 text-text">
                Trend context
              </h2>
              <CalculatorTaxTrendsChart
                series={sections.trendChart.series}
                countyName={county.name}
                valueFormat={sections.trendChart.valueFormat}
                chartTitle={sections.trendChart.title}
                chartSubtitle={sections.trendChart.subtitle}
              />
            </section>
          )}

          <section className="mb-12" aria-labelledby="faq-heading">
            <LocationFAQ
              faqs={faqs}
              title={`${townDisplayName} Property Tax FAQ`}
              subtitle={`Common questions about property taxes in ${townDisplayName}, ${county.name} County`}
              titleId="faq-heading"
            />
          </section>

          <section className="mb-12 border-t border-border pt-8" aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="text-2xl font-semibold mb-4 text-text">
              Sources
            </h2>
            <p className="text-text-muted mb-4">
              This page provides estimates for planning and comparison only. Actual property tax
              bills depend on official assessments, exemptions, and local decisions. Data as of
              latest available year by source
              {taxYearForSources != null ? (
                <> — tax rates updated through {taxYearForSources} where available.</>
              ) : (
                '.'
              )}{' '}
              Verify with your local assessor.
            </p>
            <p className="text-sm text-text-muted">
              {sourcesBlurb}{' '}
              <Link href="/methodology" className="text-primary hover:text-primary-hover underline">
                Methodology
              </Link>
              .
            </p>
          </section>

          <div className="flex flex-wrap gap-4 text-sm">
            <Link href={`/${state}`} className="text-primary hover:text-primary-hover underline">
              {stateName} overview
            </Link>
            <Link
              href={`/${state}/property-tax-calculator`}
              className="text-primary hover:text-primary-hover underline"
            >
              {abbrev} calculator
            </Link>
            <Link href={countyPageUrl} className="text-primary hover:text-primary-hover underline">
              {county.name} County
            </Link>
            <Link
              href={countyCalculatorHref}
              className="text-primary hover:text-primary-hover underline"
            >
              {county.name} County calculator
            </Link>
            <Link
              href={`/${state}/property-tax-rates`}
              className="text-primary hover:text-primary-hover underline"
            >
              {stateName} property tax rates
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
