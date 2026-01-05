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
import { getCountyLatestTaxBill } from '@/lib/data/adapter'
import CountyTownLinks from '@/components/CountyTownLinks'
import CountyTaxTrendsChart from '@/components/CountyTaxTrendsChart'

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
  const latestTaxBill = getCountyLatestTaxBill(county)
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
  const latestTaxBill = getCountyLatestTaxBill(county)
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
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey/property-tax-calculator` },
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
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {county.name} County, NJ Property Tax Calculator
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                2024 Average Residential Tax Bill:{' '}
                <span className="font-semibold">{avgTaxBill}</span>
              </p>
            </div>

            {/* Content Section */}
            <div className="prose prose-lg max-w-none mb-12 text-gray-700 dark:text-gray-300">
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
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Source:{' '}
                  <a
                    href={stateData.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-hover underline"
                  >
                    {stateData.source.name} ({stateData.source.year})
                  </a>
                </p>
              </div>

              {/* Disclaimer */}
              {county.copy?.disclaimer && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {county.copy.disclaimer}
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

            {/* Popular Towns Section */}
            <CountyTownLinks county={county} />

            {/* Tax Trends Chart */}
            <CountyTaxTrendsChart county={county} />

            {/* Internal Links Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-text">Related Resources</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/new-jersey/property-tax-calculator"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  New Jersey Property Tax Calculator
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
