import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import UniversalTaxCalculator from '@/components/calculator/UniversalTaxCalculator'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { getStatesForHero } from '@/lib/geo'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: 'Property Tax Calculator by State | Estimate Your Property Taxes',
  description:
    'Calculate property taxes by state, county, and town. Enter your home value for planning estimates, rates, and trends. Available for New Jersey with more states coming.',
  path: '/property-tax-calculator',
  keywords:
    'property tax calculator, property tax by state, estimate property taxes, county property tax, municipal tax rates',
})

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PropertyTaxCalculatorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = typeof params.state === 'string' ? params.state : undefined
  const county = typeof params.county === 'string' ? params.county : undefined
  const town = typeof params.town === 'string' ? params.town : undefined
  const homeValue = typeof params.homeValue === 'string' ? params.homeValue : undefined

  const states = getStatesForHero()
  const pageUrl = `${SITE_URL}/property-tax-calculator`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description:
            'Calculate property taxes by state, county, and town. Enter your home value for planning estimates and trends.',
        })}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="container-page py-12">
          <div className="mb-10 text-center">
            <h1 className="section-title mb-4">Property Tax Calculator</h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Select your state, county, and town, then enter your home value to see estimated
              property taxes. Available for New Jersey; more states coming as data is published.
            </p>
          </div>
          <UniversalTaxCalculator
            states={states}
            initialValues={{
              stateSlug: state,
              countySlug: county,
              townSlug: town,
              homeValue: homeValue ?? undefined,
            }}
            showStateSelect={true}
            pageType="calculator"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
