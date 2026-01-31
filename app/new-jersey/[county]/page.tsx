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
import { getStateData, getCountyBySlug, formatUSD } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import { getCountyFaqData } from '@/data/countyFaqData'
import { getLatestValue } from '@/lib/data/metrics'
import { resolveSource, resolveSourceUrl } from '@/lib/data/town-helpers'
import CountyTaxTrendsChart from '@/components/CountyTaxTrendsChart'
import RelatedLinks from '@/components/RelatedLinks'
import { selectFeaturedTowns, buildCountyTownsIndexHref } from '@/lib/links/towns'

type Props = {
  params: Promise<{
    county: string
  }>
}

/**
 * County-level property tax page for New Jersey
 * Handles routes like: /new-jersey/bergen-county-property-tax
 * Includes: WebApplication, FAQPage, and BreadcrumbList schemas
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countySlug } = await params
  const normalizedSlug = countySlug.replace(/-county-property-tax$/, '')
  const stateData = getStateData('new-jersey')
  if (!stateData) {
    return {
      title: 'State Not Found | Property Tax Calculator',
    }
  }
  const county = getCountyBySlug(stateData, normalizedSlug)

  if (!county) {
    return {
      title: 'County Not Found | NJ Property Tax Calculator',
    }
  }

  const path = `/new-jersey/${countySlug}`
  const latestTaxBill = getLatestValue(county.metrics?.averageResidentialTaxBill)
  const avgTaxBill = latestTaxBill ? formatUSD(latestTaxBill) : 'N/A'

  return buildMetadata({
    title: `${county.name} County NJ Property Tax Calculator | 2024 Avg Tax Bill`,
    description: `Estimate property taxes in ${county.name} County, NJ. Includes 2024 average residential tax bill data (${avgTaxBill}) and a planning-focused calculator.`,
    path,
    keywords: `${county.name} County property tax, ${county.name} County NJ tax calculator, New Jersey ${county.name} County property tax rate`,
    openGraph: {
      title: `${county.name} County NJ Property Tax Calculator`,
      description: `Estimate property taxes in ${county.name} County, NJ. 2024 average residential tax bill: ${avgTaxBill}.`,
      type: 'website',
    },
  })
}

export default async function CountyPropertyTaxPage({ params }: Props) {
  const { county: countySlug } = await params
  const normalizedSlug = countySlug.replace(/-county-property-tax$/, '')
  const stateData = getStateData('new-jersey')
  if (!stateData) {
    notFound()
  }
  const county = getCountyBySlug(stateData, normalizedSlug)

  if (!county) {
    notFound()
  }

  const pageUrl = `${SITE_URL}/new-jersey/${countySlug}`
  const faqs = getCountyFaqData(county.name)
  const latestTaxBill = getLatestValue(county.metrics?.averageResidentialTaxBill)
  const avgTaxBill = latestTaxBill ? formatUSD(latestTaxBill) : 'N/A'
  const neighborCounties =
    county.neighborCounties
      ?.map(name => getCountyBySlug(stateData, slugifyLocation(name)))
      .filter((c): c is NonNullable<typeof c> => c !== null) || []

  return (
    <>
      {/* BreadcrumbList schema */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey` },
          { name: `${county.name} County`, url: pageUrl },
        ])}
      />
      {/* WebApplication schema */}
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate property taxes for ${county.name} County, New Jersey. 2024 average residential tax bill: ${avgTaxBill}.`,
        })}
      />
      {/* FAQPage schema */}
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />

      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb UI */}
            <nav className="text-sm text-text-muted mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <span className="mx-2">→</span>
              <Link href="/new-jersey" className="hover:text-primary">
                New Jersey
              </Link>
              <span className="mx-2">→</span>
              <span className="text-text">{county.name} County</span>
            </nav>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-text mb-4">
                {county.name} County, NJ Property Tax Calculator
              </h1>
              <p className="text-lg text-text-muted">
                2024 Average Residential Tax Bill:{' '}
                <span className="font-semibold text-text">{avgTaxBill}</span>
              </p>
              {/* Related Links */}
              <div className="mt-4 flex justify-center">
                <RelatedLinks
                  links={[
                    { href: '/new-jersey', label: 'Back to New Jersey' },
                    { href: '/new-jersey/property-tax-rates', label: 'View NJ tax rates' },
                    { href: '/new-jersey/property-tax-calculator', label: 'NJ calculator' },
                  ]}
                />
              </div>
            </div>

            {/* Content Section */}
            <div className="prose prose-lg max-w-none mb-12 text-text-muted">
              {county.copy?.paragraphs ? (
                county.copy.paragraphs.map((paragraph, index) => (
                  <p key={index} className={index === 0 ? 'text-xl leading-relaxed' : ''}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-xl leading-relaxed">
                  Property taxes in <strong>{county.name} County</strong> vary by municipality and
                  reflect local budgets, school district needs, and county services.
                </p>
              )}

              {/* Source Link */}
              {(() => {
                const latestBill =
                  county.metrics?.averageResidentialTaxBill?.[
                    county.metrics.averageResidentialTaxBill.length - 1
                  ]
                if (!latestBill) return null
                const source = resolveSource(stateData, latestBill.sourceRef)
                const sourceUrl = resolveSourceUrl(stateData, latestBill.sourceRef, latestBill.year)
                if (!source) return null
                return (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-text-muted">
                      Source:{' '}
                      <a
                        href={sourceUrl || source.homepageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover underline"
                      >
                        {source.publisher} - {source.title} ({latestBill.year})
                      </a>
                    </p>
                  </div>
                )
              })()}

              {/* Disclaimer */}
              {county.copy?.disclaimer && (
                <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-text">{county.copy.disclaimer}</p>
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
            </div>

            {/* Calculator Section */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-text">
                  Calculate Your Property Tax
                </h2>
                <TaxForm defaultCounty={county.name} />
              </Card>
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-text">Tax Estimate</h2>
                <TaxResults />
              </Card>
            </div>

            {/* Featured Towns (max 8) + CTA to all towns */}
            {(() => {
              const featuredTowns = selectFeaturedTowns(county, { max: 8 })
              const townsIndexHref = buildCountyTownsIndexHref(countySlug)
              if (featuredTowns.length === 0) return null
              return (
                <div className="mb-12">
                  <h2 className="text-2xl font-semibold mb-4 text-text">
                    Towns in {county.name} County
                  </h2>
                  <p className="text-text-muted mb-4">
                    Browse property tax information for municipalities in {county.name} County.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {featuredTowns.map(t => (
                      <Link
                        key={t.href}
                        href={t.href}
                        className="block p-4 bg-surface border border-border rounded-lg hover:bg-bg transition-colors text-text"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="block text-sm text-text-muted mt-1">View town →</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={townsIndexHref}
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    View all {county.towns?.length ?? 0} towns in {county.name} County →
                  </Link>
                </div>
              )
            })()}

            {/* Tax Trends Chart */}
            <CountyTaxTrendsChart county={county} />
            <p className="text-xs text-text-muted mt-4">
              Learn more about how estimates are calculated in our{' '}
              <Link href="/methodology" className="text-primary hover:text-primary-hover underline">
                methodology
              </Link>
              .
            </p>

            {/* Internal Links Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-text">Related Resources</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={buildCountyTownsIndexHref(countySlug)}
                  className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                >
                  All towns in {county.name} County
                </Link>
                <Link
                  href="/new-jersey"
                  className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                >
                  New Jersey overview
                </Link>
                <Link
                  href="/new-jersey/property-tax-calculator"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  NJ Property Tax Calculator
                </Link>
                <Link
                  href="/new-jersey/property-tax-exemptions"
                  className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                >
                  NJ Property Tax Exemptions
                </Link>
                {neighborCounties.slice(0, 4).map(neighbor => (
                  <Link
                    key={neighbor.slug}
                    href={`/new-jersey/${slugifyLocation(neighbor.name)}-county-property-tax`}
                    className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                  >
                    {neighbor.name} County Taxes
                  </Link>
                ))}
                <Link
                  href="/faq"
                  className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                >
                  Property Tax FAQ
                </Link>
              </div>
            </div>

            {/* FAQ Section */}
            <LocationFAQ
              faqs={faqs}
              title={`${county.name} County Property Tax FAQ`}
              subtitle="Common questions about property taxes in this county"
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
