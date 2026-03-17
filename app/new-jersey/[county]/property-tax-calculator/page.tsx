import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import UniversalTaxCalculator from '@/components/calculator/UniversalTaxCalculator'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStatesForHero, getStateData, getCountyBySlug } from '@/lib/geo'

type Props = {
  params: Promise<{ county: string }>
}

function getCountyDisplayName(countySegment: string): string {
  const normalized = countySegment.replace(/-county-property-tax$/, '')
  const stateData = getStateData('new-jersey')
  const county = stateData ? getCountyBySlug(stateData, normalized) : null
  return county?.name ?? normalized.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * New Jersey county-level property tax calculator page.
 * Reuses the shared calculator with state and county preselected.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countyParam } = await params
  const countySegment = decodeURIComponent(countyParam)
  const path = `/new-jersey/${encodeURIComponent(countySegment)}/property-tax-calculator`
  const displayName = getCountyDisplayName(countySegment)

  return buildMetadata({
    title: `${displayName} County Property Tax Calculator | New Jersey`,
    description: `Calculate property taxes for ${displayName} County, New Jersey. Get accurate estimates based on current tax rates.`,
    path,
    keywords: `${displayName} County property tax, ${displayName} County NJ tax calculator, New Jersey property tax ${displayName}`,
    openGraph: {
      title: `${displayName} County Property Tax Calculator`,
      description: `Calculate property taxes for ${displayName} County, New Jersey.`,
      type: 'website',
    },
  })
}

export default async function CountyPropertyTaxCalculatorPage({ params }: Props) {
  const { county: countyParam } = await params
  const countySegment = decodeURIComponent(countyParam)
  const countySlug = countySegment.replace(/-county-property-tax$/, '')
  const displayName = getCountyDisplayName(countySegment)

  const states = getStatesForHero()
  const pageUrl = `${SITE_URL}/new-jersey/${encodeURIComponent(countySegment)}/property-tax-calculator`
  const njUrl = `${SITE_URL}/new-jersey`
  const countyUrl = `${SITE_URL}/new-jersey/${encodeURIComponent(countySegment)}`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: njUrl },
          { name: displayName, url: countyUrl },
          { name: 'Property Tax Calculator', url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Calculate property taxes for ${displayName} County, New Jersey. Get accurate estimates based on current tax rates.`,
        })}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="container-page py-12">
          <div className="mb-10 text-center">
            <h1 className="section-title mb-4">{displayName} County Property Tax Calculator</h1>
            <p className="text-lg text-text-muted">
              Calculate property taxes for {displayName} County, New Jersey
            </p>
          </div>
          <UniversalTaxCalculator
            states={states}
            initialValues={{ stateSlug: 'new-jersey', countySlug }}
            showStateSelect={false}
            pageType="calculator"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
