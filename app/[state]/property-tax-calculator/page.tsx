import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import UniversalTaxCalculator from '@/components/calculator/UniversalTaxCalculator'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { getStatesForHero } from '@/lib/geo'

type Props = {
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const stateName = formatStateName(state)
  const path = `/${encodeURIComponent(state)}/property-tax-calculator`

  return buildMetadata({
    title: `${stateName} Property Tax Calculator | Calculate Your Property Taxes`,
    description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.`,
    path,
    keywords: `${stateName} property tax calculator, ${stateName} property tax, calculate property taxes, ${stateName} real estate taxes`,
    openGraph: {
      title: `${stateName} Property Tax Calculator`,
      description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality.`,
      type: 'website',
    },
  })
}

export default async function StatePropertyTaxCalculatorPage({ params }: Props) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const stateName = formatStateName(state)

  if (!isValidState(state)) {
    notFound()
  }

  const states = getStatesForHero()
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/property-tax-calculator`
  const stateUrl = `${SITE_URL}/${encodeURIComponent(state)}`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: stateUrl },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.`,
        })}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="container-page py-12">
          <div className="mb-10 text-center">
            <h1 className="section-title mb-4">{stateName} Property Tax Calculator</h1>
            <p className="text-lg text-text-muted">
              Enter your property details to calculate your estimated property taxes
            </p>
            <div className="mt-4">
              <a
                href={`/${encodeURIComponent(state)}/property-tax-rates`}
                className="text-sm text-text-muted hover:text-primary transition-colors underline"
              >
                See {stateName} property tax rates by county and municipality →
              </a>
            </div>
          </div>
          <UniversalTaxCalculator
            states={states}
            initialValues={{ stateSlug: state }}
            showStateSelect={false}
            pageType="calculator"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
