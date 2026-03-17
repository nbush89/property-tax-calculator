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
  params: Promise<{ state: string; county: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countyParam } = await params
  const state = decodeURIComponent(stateParam)
  const countySegment = decodeURIComponent(countyParam)
  const stateName = formatStateName(state)
  const countySlug = countySegment.replace(/-county-property-tax$/, '')
  const countyDisplay = countySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const path = `/${encodeURIComponent(state)}/${encodeURIComponent(countySegment)}/property-tax-calculator`

  return buildMetadata({
    title: `${countyDisplay} County Property Tax Calculator | ${stateName}`,
    description: `Calculate property taxes for ${countyDisplay} County, ${stateName}. Get accurate estimates based on current tax rates.`,
    path,
    keywords: `${countyDisplay} County property tax, ${countyDisplay} County ${stateName} tax calculator, ${stateName} property tax ${countyDisplay}`,
    openGraph: {
      title: `${countyDisplay} County Property Tax Calculator`,
      description: `Calculate property taxes for ${countyDisplay} County, ${stateName}.`,
      type: 'website',
    },
  })
}

export default async function StateCountyPropertyTaxCalculatorPage({ params }: Props) {
  const { state: stateParam, county: countyParam } = await params
  const state = decodeURIComponent(stateParam)
  const countySegment = decodeURIComponent(countyParam)
  const countySlug = countySegment.replace(/-county-property-tax$/, '')
  const stateName = formatStateName(state)
  const countyDisplay = countySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  if (!isValidState(state)) {
    notFound()
  }

  const states = getStatesForHero()
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/${encodeURIComponent(countySegment)}/property-tax-calculator`
  const stateUrl = `${SITE_URL}/${encodeURIComponent(state)}`
  const countyUrl = `${SITE_URL}/${encodeURIComponent(state)}/${encodeURIComponent(countySegment)}`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: stateUrl },
          { name: countyDisplay, url: countyUrl },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate property taxes for ${countyDisplay} County, ${stateName}. Get accurate estimates based on current tax rates.`,
        })}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="container-page py-12">
          <div className="mb-10 text-center">
            <h1 className="section-title mb-4">{countyDisplay} County Property Tax Calculator</h1>
            <p className="text-lg text-text-muted">
              Calculate property taxes for {countyDisplay} County, {stateName}
            </p>
          </div>
          <UniversalTaxCalculator
            states={states}
            initialValues={{ stateSlug: state, countySlug }}
            showStateSelect={false}
            pageType="calculator"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
