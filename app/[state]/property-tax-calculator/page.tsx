import type { Metadata } from 'next'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { generateStructuredData, generateBreadcrumbStructuredData } from '@/utils/seo'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'

type Props = {
  params: {
    state: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const state = decodeURIComponent(params.state)
  const stateName = formatStateName(state)
  
  return {
    title: `${stateName} Property Tax Calculator | Calculate Your Property Taxes`,
    description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.`,
    keywords: `${stateName} property tax calculator, ${stateName} property tax, calculate property taxes, ${stateName} real estate taxes`,
    openGraph: {
      title: `${stateName} Property Tax Calculator`,
      description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality.`,
      type: 'website',
    },
  }
}

export default function StatePropertyTaxCalculatorPage({ params }: Props) {
  const state = decodeURIComponent(params.state)
  const stateName = formatStateName(state)
  
  // Validate state is supported
  if (!isValidState(state)) {
    notFound()
  }
  
  const structuredData = generateStructuredData({
    title: `${stateName} Property Tax Calculator`,
    description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality.`,
    type: 'WebApplication',
  })

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: 'https://yoursite.com/' },
    { name: stateName, url: `https://yoursite.com/${encodeURIComponent(state)}` },
    { name: 'Property Tax Calculator', url: `https://yoursite.com/${encodeURIComponent(state)}/property-tax-calculator` },
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
                {stateName} Property Tax Calculator
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Enter your property details to calculate your estimated property taxes
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <TaxForm />
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

