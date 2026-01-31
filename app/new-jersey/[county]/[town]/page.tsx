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
import { getTownBySlugs, getNewJerseyData } from '@/utils/stateData'
import { slugifyLocation } from '@/utils/locationUtils'
import { getTownFaqData } from '@/data/townFaqData'
import { buildTownCopyContext } from '@/lib/data/copy'
import TownAtAGlance from '@/components/town/TownAtAGlance'
import CalculatorTaxTrendsChart from '@/components/charts/CalculatorTaxTrendsChart'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { validateTownOverview } from '@/lib/town-overview/validate'
import { getCountyAvgTaxBillSeries } from '@/utils/getCountySeries'
import type { StateData, CountyData, TownData } from '@/lib/data/types'

type Props = {
  params: Promise<{
    county: string
    town: string
  }>
}

/**
 * Town-level property tax page for New Jersey
 * Handles routes like: /new-jersey/bergen/ridgewood-property-tax
 * Includes: WebApplication, FAQPage, and BreadcrumbList schemas
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countySlug, town: townSlug } = await params

  if (!countySlug || !townSlug || typeof townSlug !== 'string') {
    return {
      title: 'Location Not Found | NJ Property Tax Calculator',
    }
  }

  const normalizedTownSlug = townSlug.replace(/-property-tax$/, '')
  const result = getTownBySlugs(countySlug, normalizedTownSlug)

  if (!result) {
    return {
      title: 'Location Not Found | NJ Property Tax Calculator',
    }
  }

  const { county, town } = result
  const path = `/new-jersey/${countySlug}/${townSlug}`
  const stateData = getNewJerseyData()
  const { getMetricLatest } = await import('@/lib/data/town-helpers')
  const effectiveRate = getMetricLatest({
    town,
    county,
    metricKey: 'effectiveTaxRate',
  })
  // Prefer town.overview (from ingestion); fallback to metrics for compatibility
  const overview = town.overview && validateTownOverview(town.overview) ? town.overview : null
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
  const title = `${town.name}, ${county.name} County NJ Property Tax Calculator${titleSuffix}`
  const description = `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey. ${avgBillText}${rateText ? `Effective rate: ${rateText}. ` : ''}Planning estimates with our free calculator.`

  return buildMetadata({
    title,
    description,
    path,
    keywords: `${town.name} property tax, ${town.name} ${county.name} County tax calculator, New Jersey ${town.name} property tax rate`,
    openGraph: {
      title: title.trim(),
      description,
      type: 'website',
    },
  })
}

export default async function TownPropertyTaxPage({ params }: Props) {
  const { county: countySlug, town: townSlug } = await params

  if (!countySlug || !townSlug || typeof townSlug !== 'string') {
    notFound()
  }

  const normalizedTownSlug = townSlug.replace(/-property-tax$/, '')
  const result = getTownBySlugs(countySlug, normalizedTownSlug)

  if (!result) {
    notFound()
  }

  const { county, town } = result
  const stateData = getNewJerseyData()
  const countyRouteSegment = `${slugifyLocation(county.name)}-county-property-tax`
  const pageUrl = `${SITE_URL}/new-jersey/${countySlug}/${townSlug}`
  const countyPageUrl = `${SITE_URL}/new-jersey/${countyRouteSegment}`
  const faqs = getTownFaqData(town.name, county.name)
  const copyContext = buildTownCopyContext({ state: stateData, county, town })
  const asOfYear = copyContext.asOfYear
  const countySeries = getCountyAvgTaxBillSeries('new-jersey', county.name)
  const showTrendsChart = countySeries.length >= 3

  return (
    <>
      {/* BreadcrumbList schema */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey` },
          { name: `${county.name} County`, url: countyPageUrl },
          { name: town.name, url: pageUrl },
        ])}
      />
      {/* WebApplication schema */}
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey.`,
        })}
      />
      {/* FAQPage schema */}
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      {/* WebPage with dateModified when overview has lastUpdated */}
      {(town.overview?.provenance?.lastUpdated ??
        (town.overview?.sources?.[0] as { retrieved?: string })?.retrieved) && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            url: pageUrl,
            name: `${town.name}, ${county.name} County NJ Property Tax Calculator`,
            dateModified:
              town.overview?.provenance?.lastUpdated ??
              (town.overview?.sources?.[0] as { retrieved?: string } | undefined)?.retrieved,
          }}
        />
      )}

      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Hero: H1 + subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-text mb-2">
                {town.name}, {county.name} County {stateData.state.abbreviation} Property Tax
                Calculator
              </h1>
              <p className="text-sm text-text-muted italic">
                Planning estimate (not official tax data)
              </p>
            </div>

            {/* Breadcrumbs */}
            <nav className="text-sm text-text-muted mb-4" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <span className="mx-2">→</span>
              <Link href="/new-jersey" className="hover:text-primary">
                New Jersey
              </Link>
              <span className="mx-2">→</span>
              <Link href={countyPageUrl} className="hover:text-primary">
                {county.name} County
              </Link>
              <span className="mx-2">→</span>
              <span className="text-text">{town.name}</span>
            </nav>

            {/* Max 2 quick links in hero area */}
            <nav className="mb-8 flex flex-wrap gap-3 text-sm">
              <Link
                href={countyPageUrl}
                className="text-primary hover:text-primary-hover underline"
              >
                ← Back to {county.name} County
              </Link>
              <span className="text-text-muted">·</span>
              <Link
                href="/new-jersey/property-tax-rates"
                className="text-primary hover:text-primary-hover underline"
              >
                NJ property tax rates
              </Link>
            </nav>

            {/* Town at a glance (single summary card) */}
            <TownAtAGlance
              townName={town.name}
              countyName={county.name}
              stateCode={stateData.state.abbreviation}
              overview={town.overview}
            />

            {/* Estimate property taxes: calculator + short inline note */}
            <section className="mb-12" aria-labelledby="estimate-heading">
              <h2 id="estimate-heading" className="text-2xl font-semibold mb-4 text-text">
                Estimate property taxes
              </h2>
              <p className="text-text-muted mb-2">
                Use the calculator below with your home value. Estimates are for planning
                only—verify with your local assessor.
              </p>
              <div className="grid lg:grid-cols-2 gap-8 mt-4">
                <Card className="p-6">
                  <TaxForm defaultCounty={county.name} defaultMunicipality={town.name} />
                </Card>
                <Card className="p-6">
                  <TaxResults />
                </Card>
              </div>
            </section>

            {/* Trends chart: only when >= 3 years of county data */}
            {showTrendsChart && (
              <section className="mb-12" aria-labelledby="trends-heading">
                <h2 id="trends-heading" className="text-2xl font-semibold mb-4 text-text">
                  {countySeries.length >= 5
                    ? '5-year trend'
                    : `${countySeries.length}-year trend (${countySeries[0].year}–${countySeries[countySeries.length - 1].year})`}
                </h2>
                <p className="text-sm text-text-muted mb-4">
                  County average residential tax bill. Planning context only.
                </p>
                <CalculatorTaxTrendsChart series={countySeries} countyName={county.name} />
              </section>
            )}

            {/* FAQ (accordion) */}
            <section className="mb-12" aria-labelledby="faq-heading">
              <LocationFAQ
                faqs={faqs}
                title={`${town.name} Property Tax FAQ`}
                subtitle={`Common questions about property taxes in ${town.name}, ${county.name} County`}
                titleId="faq-heading"
              />
            </section>

            {/* Sources + single disclaimer block */}
            <section
              className="mb-12 border-t border-border pt-8"
              aria-labelledby="sources-heading"
            >
              <h2 id="sources-heading" className="text-2xl font-semibold mb-4 text-text">
                Sources
              </h2>
              <p className="text-text-muted mb-4">
                This page provides estimates for planning and comparison only. Actual property tax
                bills depend on official assessments, exemptions, and local decisions. Data as of{' '}
                {asOfYear}—verify with your local assessor.
              </p>
              <p className="text-sm text-text-muted">
                New Jersey Division of Taxation, U.S. Census Bureau, and other public data.{' '}
                <Link
                  href="/methodology"
                  className="text-primary hover:text-primary-hover underline"
                >
                  Methodology
                </Link>
                .
              </p>
            </section>

            {/* Related links (small) */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href={countyPageUrl}
                className="text-primary hover:text-primary-hover underline"
              >
                {county.name} County
              </Link>
              <Link href="/new-jersey" className="text-primary hover:text-primary-hover underline">
                NJ overview
              </Link>
              <Link
                href="/new-jersey/property-tax-calculator"
                className="text-primary hover:text-primary-hover underline"
              >
                NJ calculator
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
