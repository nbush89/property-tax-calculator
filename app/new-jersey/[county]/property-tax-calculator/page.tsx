import type { Metadata } from 'next'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { generateStructuredData, generateBreadcrumbStructuredData } from '@/utils/seo'

type Props = {
  params: Promise<{
    county: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countyParam } = await params
  const county = decodeURIComponent(countyParam)
  return {
    title: `${county} County Property Tax Calculator | New Jersey`,
    description: `Calculate property taxes for ${county} County, New Jersey. Get accurate estimates based on current tax rates.`,
    keywords: `${county} County property tax, ${county} County NJ tax calculator, New Jersey property tax ${county}`,
    openGraph: {
      title: `${county} County Property Tax Calculator`,
      description: `Calculate property taxes for ${county} County, New Jersey.`,
      type: 'website',
    },
  }
}

export default async function CountyPropertyTaxCalculatorPage({ params }: Props) {
  const { county: countyParam } = await params
  const county = decodeURIComponent(countyParam)
  
  const structuredData = generateStructuredData({
    title: `${county} County Property Tax Calculator`,
    description: `Calculate property taxes for ${county} County, New Jersey.`,
    type: 'WebApplication',
  })

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: 'https://yoursite.com/' },
    { name: 'New Jersey', url: 'https://yoursite.com/new-jersey' },
    { name: county, url: `https://yoursite.com/new-jersey/${encodeURIComponent(county)}` },
    { name: 'Property Tax Calculator', url: `https://yoursite.com/new-jersey/${encodeURIComponent(county)}/property-tax-calculator` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
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
