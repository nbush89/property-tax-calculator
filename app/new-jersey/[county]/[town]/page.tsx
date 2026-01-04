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
import { getTownBySlugs, formatTaxRate, compareToStateAverage } from '@/utils/stateData'
import { slugifyLocation } from '@/utils/locationUtils'
import { getTownFaqData } from '@/data/townFaqData'
import { getNewJerseyData } from '@/utils/stateData'

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
  const townRateText = formatTaxRate(town.avgRate)
  const countyRateText = formatTaxRate(county.avgEffectiveRate)

  return buildMetadata({
    title: `${town.name}, ${county.name} County NJ Property Tax Calculator | ${townRateText} Rate`,
    description: `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey. ${town.name} has an average rate of ${townRateText} compared to ${county.name} County's average of ${countyRateText}. Get accurate estimates with our free calculator.`,
    path,
    keywords: `${town.name} property tax, ${town.name} ${county.name} County tax calculator, New Jersey ${town.name} property tax rate`,
    openGraph: {
      title: `${town.name}, ${county.name} County NJ Property Tax Calculator`,
      description: `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey. Average rate: ${townRateText}.`,
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
  const townRateComparison = compareToStateAverage(town.avgRate)
  const pageUrl = `${SITE_URL}/new-jersey/${countySlug}/${townSlug}`
  const countyPageUrl = `${SITE_URL}/new-jersey/${slugifyLocation(county.name)}-county-property-tax`
  const faqs = getTownFaqData(town.name, county.name)

  const townRateText = formatTaxRate(town.avgRate)
  const countyRateText = formatTaxRate(county.avgEffectiveRate)
  const stateAvgText = formatTaxRate(stateData.avgTaxRate)

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
          description: `Calculate property taxes for ${town.name}, ${county.name} County, New Jersey. Average rate: ${townRateText}.`,
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
                {town.name}, {county.name} County NJ Property Tax Calculator
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Average Rate: <span className="font-semibold">{townRateText}</span> | County Average: {countyRateText}
              </p>
            </div>

            {/* Content Section */}
            <div className="prose prose-lg max-w-none mb-12 text-gray-700 dark:text-gray-300">
              <p className="text-xl leading-relaxed">
                Property owners in <strong>{town.name}</strong>, located in <strong>{county.name} County</strong>, face property tax rates that reflect both local municipal needs and county-wide services. With an average rate of <strong>{townRateText}</strong>, {town.name}'s property taxes are {townRateComparison.isHigher ? 'above' : 'below'} the New Jersey state average of {stateAvgText}.
              </p>

              <p>
                The property tax rate in {town.name} includes contributions to {county.name} County services, {town.name} municipal operations, local school district funding, and other taxing authorities. The rate of {townRateText} compares to {county.name} County's overall average of {countyRateText}, reflecting {town.name}'s specific budget requirements and service levels.
              </p>

              <p>
                To calculate your specific property tax obligation in {town.name}, use the calculator below. Enter your property's assessed value, and the calculator will automatically use {town.name}'s current tax rates. You can also select applicable exemptions such as Senior Citizen Freeze, Veteran exemptions, or Disabled Person exemptions to see how they reduce your tax burden.
              </p>

              <p>
                Understanding property taxes in {town.name} is crucial for homeowners and prospective buyers. The calculator provides both annual and monthly estimates, along with a detailed breakdown showing how your taxes support county services, municipal operations, and local schools.
              </p>
            </div>

            {/* Calculator Section */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-text">Calculate Your Property Tax</h2>
                <TaxForm 
                  defaultCounty={county.name} 
                  defaultMunicipality={town.name}
                />
              </Card>
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-text">Tax Estimate</h2>
                <TaxResults />
              </Card>
            </div>

            {/* Internal Links Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-text">Related Resources</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={countyPageUrl}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  {county.name} County Property Taxes
                </Link>
                <Link
                  href="/new-jersey/property-tax-calculator"
                  className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
                >
                  New Jersey Property Tax Calculator
                </Link>
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
