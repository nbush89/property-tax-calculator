import type { Metadata } from 'next'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { generateStructuredData, generateBreadcrumbStructuredData } from '@/utils/seo'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{
    state: string
    county: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countyParam } = await params
  const state = decodeURIComponent(stateParam)
  const county = decodeURIComponent(countyParam)
  const stateName = formatStateName(state)
  
  return {
    title: `${county} County Property Tax Calculator | ${stateName}`,
    description: `Calculate property taxes for ${county} County, ${stateName}. Get accurate estimates based on current tax rates.`,
    keywords: `${county} County property tax, ${county} County ${stateName} tax calculator, ${stateName} property tax ${county}`,
    openGraph: {
      title: `${county} County Property Tax Calculator`,
      description: `Calculate property taxes for ${county} County, ${stateName}.`,
      type: 'website',
    },
  }
}

export default async function CountyPropertyTaxCalculatorPage({ params }: Props) {
  const { state: stateParam, county: countyParam } = await params
  const state = decodeURIComponent(stateParam)
  const county = decodeURIComponent(countyParam)
  const stateName = formatStateName(state)
  
  // Validate state is supported
  if (!isValidState(state)) {
    notFound()
  }
  
  const structuredData = generateStructuredData({
    title: `${county} County Property Tax Calculator`,
    description: `Calculate property taxes for ${county} County, ${stateName}.`,
    type: 'WebApplication',
  })

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: 'https://yoursite.com/' },
    { name: stateName, url: `https://yoursite.com/${encodeURIComponent(state)}` },
    { name: county, url: `https://yoursite.com/${encodeURIComponent(state)}/${encodeURIComponent(county)}` },
    { name: 'Property Tax Calculator', url: `https://yoursite.com/${encodeURIComponent(state)}/${encodeURIComponent(county)}/property-tax-calculator` },
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
                Calculate property taxes for {county} County, {stateName}
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

