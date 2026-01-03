import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { Card } from '@/components/ui/Card'
import { generateStructuredData, generateBreadcrumbStructuredData } from '@/utils/seo'

export const metadata: Metadata = {
  title: 'New Jersey Property Tax Calculator | Calculate Your Property Taxes',
  description: 'Calculate your New Jersey property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.',
  keywords: 'New Jersey property tax calculator, NJ property tax, calculate property taxes, New Jersey real estate taxes',
  openGraph: {
    title: 'New Jersey Property Tax Calculator',
    description: 'Calculate your New Jersey property taxes by entering your property value, county, and municipality.',
    type: 'website',
  },
}

const structuredData = generateStructuredData({
  title: 'New Jersey Property Tax Calculator',
  description: 'Calculate your New Jersey property taxes by entering your property value, county, and municipality.',
  type: 'WebApplication',
})

const breadcrumbData = generateBreadcrumbStructuredData([
  { name: 'Home', url: 'https://yoursite.com/' },
  { name: 'New Jersey', url: 'https://yoursite.com/new-jersey' },
  { name: 'Property Tax Calculator', url: 'https://yoursite.com/new-jersey/property-tax-calculator' },
])

export default function PropertyTaxCalculatorPage() {
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
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="container-page py-12">
          <div className="mb-12 text-center">
            <h1 className="section-title mb-4">
              New Jersey Property Tax Calculator
            </h1>
            <p className="text-lg muted">
              Enter your property details to calculate your estimated property taxes
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="p-6">
              <TaxForm />
            </Card>
            <Card className="p-6">
              <TaxResults />
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
