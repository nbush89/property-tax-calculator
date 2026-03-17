import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import UniversalTaxCalculator from '@/components/calculator/UniversalTaxCalculator'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/site'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { getStatesForHero } from '@/lib/geo'

export const metadata: Metadata = buildMetadata({
  title: 'New Jersey Property Tax Calculator | Calculate Your Property Taxes',
  description:
    'Calculate your New Jersey property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.',
  path: '/new-jersey/property-tax-calculator',
  keywords:
    'New Jersey property tax calculator, NJ property tax, calculate property taxes, New Jersey real estate taxes',
  openGraph: {
    title: 'New Jersey Property Tax Calculator',
    description:
      'Calculate your New Jersey property taxes by entering your property value, county, and municipality.',
    type: 'website',
  },
})

export default function NewJerseyPropertyTaxCalculatorPage() {
  const states = getStatesForHero()
  const pageUrl = `${SITE_URL}/new-jersey/property-tax-calculator`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey` },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
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
          <div className="mb-10 text-center">
            <h1 className="section-title mb-4">New Jersey Property Tax Calculator</h1>
            <p className="text-lg text-text-muted">
              Enter your property details to calculate your estimated property taxes
            </p>
            <div className="mt-4">
              <Link
                href="/new-jersey/property-tax-rates"
                className="text-sm text-text-muted hover:text-primary transition-colors underline"
              >
                See New Jersey property tax rates by county and municipality →
              </Link>
            </div>
          </div>
          <UniversalTaxCalculator
            states={states}
            initialValues={{ stateSlug: 'new-jersey' }}
            showStateSelect={false}
            pageType="calculator"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
