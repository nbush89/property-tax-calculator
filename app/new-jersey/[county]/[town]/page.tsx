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
import TownTaxSnapshot from '@/components/TownTaxSnapshot'
import { getMetricLatest } from '@/lib/data/town-helpers'

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

  // Get effective tax rate for metadata (town first, then county fallback)
  const stateData = getNewJerseyData()
  const { getMetricLatest } = await import('@/lib/data/town-helpers')
  const effectiveRate = getMetricLatest({
    town,
    county,
    metricKey: 'effectiveTaxRate',
  })
  const rateText = effectiveRate ? `${effectiveRate.value.toFixed(2)}%` : ''

  return buildMetadata({
    title: `${town.name}, ${county.name} County NJ Property Tax Calculator${rateText ? ` | ${rateText}` : ''}`,
    description: `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey. ${rateText ? `Effective rate: ${rateText}. ` : ''}Get planning estimates with our free calculator.`,
    path,
    keywords: `${town.name} property tax, ${town.name} ${county.name} County tax calculator, New Jersey ${town.name} property tax rate`,
    openGraph: {
      title: `${town.name}, ${county.name} County NJ Property Tax Calculator`,
      description: `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey.${rateText ? ` Effective rate: ${rateText}.` : ''}`,
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
  const pageUrl = `${SITE_URL}/new-jersey/${countySlug}/${townSlug}`
  const countyPageUrl = `${SITE_URL}/new-jersey/${slugifyLocation(county.name)}-county-property-tax`
  const faqs = getTownFaqData(town.name, county.name)

  // Build copy context for conditional rendering
  const copyContext = buildTownCopyContext({ state: stateData, county, town })
  const asOfYear = copyContext.asOfYear

  return (
    <>
      {/* BreadcrumbList schema */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey/property-tax-calculator` },
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

      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-text mb-4">
                {town.name}, {county.name} County NJ Property Tax Calculator
              </h1>
              <p className="text-sm text-text-muted italic">
                Planning estimate (not official tax data)
              </p>
            </div>

            {/* Section 1: Intro Context */}
            <div className="prose prose-lg max-w-none mb-8 text-text-muted">
              {town.copy?.intro ? (
                town.copy.intro.map((paragraph, index) => (
                  <p key={index} className={index === 0 ? 'text-xl leading-relaxed mb-4' : 'mb-4'}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-xl leading-relaxed mb-4">
                    Property taxes in{' '}
                    <strong className="font-semibold text-text">{town.name}</strong>, New Jersey are
                    influenced by a combination of local municipal budgets, school district funding,
                    and county-level tax rates. Homeowners in {town.name} often see tax bills that
                    differ meaningfully from nearby towns due to differences in home values,
                    assessments, and local spending priorities.
                  </p>
                  <p className="mb-4">
                    This page provides a planning-level estimate of property taxes in {town.name},
                    using the most recently available data and historical trends where available. It
                    is designed to help homeowners and prospective buyers understand relative tax
                    burden — not to replace official tax bills or municipal assessments.
                  </p>
                </>
              )}
            </div>

            {/* Local Tax Snapshot */}
            <TownTaxSnapshot state={stateData} county={county} town={town} />
            <p className="text-xs text-text-muted mb-4">
              Learn more about how estimates are calculated in our{' '}
              <Link href="/methodology" className="text-primary hover:text-primary-hover underline">
                methodology
              </Link>
              .
            </p>

            {/* Section 2: How Property Taxes Work */}
            <div className="prose prose-lg max-w-none mb-8 text-text-muted">
              <h2 className="text-2xl font-semibold mb-4 text-text">
                How Property Taxes Work in {town.name}
              </h2>
              <p>
                In {town.name}, property taxes are calculated by applying local and county tax rates
                to a property's assessed value. While assessments are determined locally, overall
                tax burden is shaped by municipal budgets, school funding requirements, and
                county-wide obligations. As a result, two homes with similar market values can face
                different tax bills depending on location and assessment history.
              </p>
            </div>

            {/* Section 3: Data Snapshot */}
            <div className="prose prose-lg max-w-none mb-8 text-text-muted">
              {town.copy?.snapshot ? (
                <p>{town.copy.snapshot[0]}</p>
              ) : copyContext.hasTownRate || copyContext.hasTownHomeValue ? (
                <p>
                  Based on recent data, {town.name} has an effective property tax rate that reflects
                  both local and county funding needs. When paired with typical home values in the
                  area, this results in property tax bills that are generally comparable to the
                  surrounding region. Historical data shows that tax levels in {town.name} have
                  remained relatively stable over the past several years.
                </p>
              ) : (
                <p>
                  {town.name} does not publish a standalone average residential tax bill. In these
                  cases, county-level tax data provides useful context for estimating local tax
                  burden. While individual bills vary by assessment, county trends help illustrate
                  how property taxes in {town.name} compare to nearby municipalities.
                </p>
              )}
            </div>

            {/* Section 4: Calculator Embed */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-text">
                Estimate Your Property Taxes in {town.name}
              </h2>
              <p className="text-text-muted mb-6">
                Use the calculator below to estimate property taxes in {town.name}. The calculator
                is pre-configured using the most recent available data and allows you to adjust home
                value assumptions for planning purposes.
              </p>

              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="p-6">
                  <TaxForm defaultCounty={county.name} defaultMunicipality={town.name} />
                </Card>
                <Card className="p-6">
                  <TaxResults />
                </Card>
              </div>
            </div>

            {/* Section 5: Historical Context (only if ≥2 years exist) */}
            {copyContext.hasHistory && (
              <div className="prose prose-lg max-w-none mb-8 text-text-muted">
                <h2 className="text-2xl font-semibold mb-4 text-text">
                  Property Tax Trends in {town.name}
                </h2>
                <p>
                  Looking at historical data can help put current property taxes in context. Over
                  the past several years, property tax levels in {town.name} have reflected broader
                  trends in local government spending, school funding, and property values. While
                  year-to-year changes are typically incremental, long-term trends can meaningfully
                  affect total cost of ownership.
                </p>
                <p className="text-xs text-text-muted mt-4">
                  For details on data sources and how estimates are calculated, see our{' '}
                  <Link
                    href="/methodology"
                    className="text-primary hover:text-primary-hover underline"
                  >
                    methodology
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* Section 6: Comparison Context */}
            {town.copy?.compare && (
              <div className="prose prose-lg max-w-none mb-8 text-text-muted">
                <h2 className="text-2xl font-semibold mb-4 text-text">
                  Comparing {town.name} to Nearby Areas
                </h2>
                <p>{town.copy.compare[0]}</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link
                    href={countyPageUrl}
                    className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                  >
                    {county.name} County Property Taxes
                  </Link>
                  <Link
                    href="/new-jersey/property-tax-calculator"
                    className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                  >
                    New Jersey Property Tax Calculator
                  </Link>
                </div>
              </div>
            )}

            {/* Section 7: Disclaimer + Sources */}
            <div className="prose prose-lg max-w-none mb-12 text-text-muted border-t border-border pt-8">
              <h2 className="text-2xl font-semibold mb-4 text-text">Important Information</h2>
              <p className="mb-4">
                <strong className="font-semibold text-text">Important note:</strong> This page
                provides estimates for planning and comparison purposes only. Actual property tax
                bills depend on official assessments, exemptions, and local tax decisions. Data
                reflects the most recently available information as of {asOfYear} and may lag
                current tax bills.
              </p>
              <p className="text-sm text-text-muted">
                <strong className="font-semibold text-text">Sources:</strong> New Jersey Division of
                Taxation, U.S. Census Bureau, and other public data sources.
              </p>
            </div>

            {/* FAQ Section */}
            <LocationFAQ
              faqs={faqs}
              title={`${town.name} Property Tax FAQ`}
              subtitle={`Common questions about property taxes in ${town.name}, ${county.name} County`}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
