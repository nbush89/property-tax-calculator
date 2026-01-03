import type { Metadata } from 'next'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'

type Props = {
  params: Promise<{
    county: string
  }>
}

/**
 * New Jersey county-level property tax calculator page.
 * Includes: WebApplication and BreadcrumbList schemas.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countyParam } = await params
  const county = decodeURIComponent(countyParam)
  const path = `/new-jersey/${encodeURIComponent(county)}/property-tax-calculator`

  return buildMetadata({
    title: `${county} County Property Tax Calculator | New Jersey`,
    description: `Calculate property taxes for ${county} County, New Jersey. Get accurate estimates based on current tax rates.`,
    path,
    keywords: `${county} County property tax, ${county} County NJ tax calculator, New Jersey property tax ${county}`,
    openGraph: {
      title: `${county} County Property Tax Calculator`,
      description: `Calculate property taxes for ${county} County, New Jersey.`,
      type: 'website',
    },
  })
}

export default async function CountyPropertyTaxCalculatorPage({ params }: Props) {
  const { county: countyParam } = await params
  const county = decodeURIComponent(countyParam)

  const pageUrl = `${SITE_URL}/new-jersey/${encodeURIComponent(county)}/property-tax-calculator`
  const njUrl = `${SITE_URL}/new-jersey`
  const countyUrl = `${SITE_URL}/new-jersey/${encodeURIComponent(county)}`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: njUrl },
          { name: county, url: countyUrl },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
      {/* WebApplication schema - describes the calculator tool */}
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate property taxes for ${county} County, New Jersey. Get accurate estimates based on current tax rates.`,
        })}
      />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {county} County Property Tax Calculator
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Calculate property taxes for {county} County, New Jersey
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <TaxForm defaultCounty={county} />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <TaxResults />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
