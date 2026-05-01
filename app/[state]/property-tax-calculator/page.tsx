import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import SteppedCalculatorClient from '@/components/calculator/SteppedCalculatorClient'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { getStatesForHero, getStateData } from '@/lib/geo'
import { buildPreviewMetricsMap } from '@/lib/calculator/previewMetrics'
import { getMaxEffectiveTaxRateYearInState } from '@/lib/rates-from-state'

type Props = {
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const stateData = getStateData(state)
  const stateName = stateData?.state.name ?? formatStateName(state)
  const abbrev = stateData?.state.abbreviation ?? formatStateName(state)
  const dataYear = stateData
    ? (getMaxEffectiveTaxRateYearInState(stateData) ?? stateData.state.asOfYear)
    : null
  const yearSuffix = dataYear ? ` (${dataYear})` : ''
  const path = `/${encodeURIComponent(state)}/property-tax-calculator`

  return buildMetadata({
    title: `${abbrev} Property Tax Calculator | Calculate Your Taxes${yearSuffix}`,
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

  if (!isValidState(state)) notFound()

  const stateData = getStateData(state)
  const stateName = stateData?.state.name ?? formatStateName(state)
  const stateAbbrev = stateData?.state.abbreviation ?? formatStateName(state)

  const states = getStatesForHero()
  const previewMetrics = buildPreviewMetricsMap()
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
        {/* Page header */}
        <div className="page-header-bar">
          <div className="container-page">
            <nav className="text-sm text-text-muted mb-3" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">→</span>
              <Link href={`/${state}`} className="hover:text-primary transition-colors">{stateName}</Link>
              <span className="mx-2">→</span>
              <span className="text-text">Property Tax Calculator</span>
            </nav>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  {stateName} Property Tax Calculator
                </h1>
                <p className="mt-1 text-sm text-text-muted">
                  Select your county and municipality, enter your home value, and get a planning estimate.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={`/${state}/property-tax-rates`}
                  className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap"
                >
                  View {stateAbbrev} rates by county →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container-page py-8">
          <SteppedCalculatorClient
            states={states}
            previewMetrics={previewMetrics}
            initialStateSlug={state}
            lockState={true}
            pageType="state"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
