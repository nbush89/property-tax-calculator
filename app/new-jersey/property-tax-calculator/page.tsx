import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { Card } from '@/components/ui/Card'
import LocationDirectory from '@/components/location/LocationDirectory'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/site'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'

/**
 * New Jersey property tax calculator page metadata and JSON-LD structured data.
 * Includes: WebApplication and BreadcrumbList schemas.
 */
export const metadata = buildMetadata({
  title: 'New Jersey Property Tax Calculator | Calculate Your Property Taxes',
  description: 'Calculate your New Jersey property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.',
  path: '/new-jersey/property-tax-calculator',
  keywords: 'New Jersey property tax calculator, NJ property tax, calculate property taxes, New Jersey real estate taxes',
  openGraph: {
    title: 'New Jersey Property Tax Calculator',
    description: 'Calculate your New Jersey property taxes by entering your property value, county, and municipality.',
    type: 'website',
  },
})

export default function PropertyTaxCalculatorPage() {
  const pageUrl = `${SITE_URL}/new-jersey/property-tax-calculator`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey` },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
      {/* WebApplication schema - describes the calculator tool */}
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description:
            'Estimate New Jersey property taxes by county and town. See annual and monthly totals, effective rates, and exemptions.',
        })}
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
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <Card className="p-6">
              <TaxForm />
            </Card>
            <Card className="p-6">
              <TaxResults />
            </Card>
          </div>

          <LocationDirectory />
        </div>
      </main>
      <Footer />
    </>
  )
}
