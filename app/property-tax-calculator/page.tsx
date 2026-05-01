import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import SteppedCalculatorClient from '@/components/calculator/SteppedCalculatorClient'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { getStatesForHero } from '@/lib/geo'
import { buildPreviewMetricsMap } from '@/lib/calculator/previewMetrics'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: 'Property Tax Calculator by State | Estimate Your Property Taxes',
  description:
    'Calculate property taxes by state, county, and town. Planning estimates from published rates—supported states include New Jersey and Texas, with more as data is added.',
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
  const previewMetrics = buildPreviewMetricsMap()
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
        {/* Page header */}
        <div className="page-header-bar">
          <div className="container-page">
            <nav className="text-sm text-text-muted mb-3" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">→</span>
              <span className="text-text">Property Tax Calculator</span>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Property Tax Calculator
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Select your state, county, and town, then enter your home value for a planning estimate.
              New Jersey and Texas supported; more states added as data is published.
            </p>
          </div>
        </div>

        <div className="container-page py-8">
          <SteppedCalculatorClient
            states={states}
            previewMetrics={previewMetrics}
            initialStateSlug={state}
            initialCountySlug={county}
            initialTownSlug={town}
            initialHomeValue={homeValue}
            lockState={false}
            pageType="calculator"
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
