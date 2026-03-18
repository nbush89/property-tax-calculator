import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStateData, getCountyBySlug, formatUSD } from '@/lib/geo'
import { buildTownHref, getTownSlug, getCountyShortSlug } from '@/lib/links/towns'
import { getTownDisplayName } from '@/utils/locationUtils'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { isTownPublished } from '@/lib/sitemaps'
import { isValidState } from '@/utils/stateUtils'
import CountyTownDirectory from '@/components/location/CountyTownDirectory'
import CountyTownsFilter from '@/components/CountyTownsFilter'
import CountyTownsLoadMore from '@/components/CountyTownsLoadMore'

type Props = {
  params: Promise<{ state: string; county: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countySegment } = await params
  const state = decodeURIComponent(stateParam)
  const normalizedSlug = countySegment.replace(/-county-property-tax$/, '')
  if (!isValidState(state)) return { title: 'State Not Found | Property Tax Calculator' }
  const stateData = getStateData(state)
  if (!stateData) return { title: 'State Not Found | Property Tax Calculator' }
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) return { title: 'County Not Found | Property Tax Calculator' }

  const publishedCount = (county.towns || []).filter(t => getTownSlug(t) && isTownPublished(t)).length
  const path = `/${encodeURIComponent(state)}/${countySegment}/towns`
  return buildMetadata({
    title: `Property Tax Towns in ${county.name} County, ${stateData.state.abbreviation}`,
    description: `Explore property taxes by town in ${county.name} County, ${stateData.state.name}. ${publishedCount} town pages with rates and estimates.`,
    path,
    keywords: `${county.name} County towns, ${county.name} County property tax, ${stateData.state.abbreviation} municipalities`,
    openGraph: {
      title: `Property Tax Towns in ${county.name} County, ${stateData.state.abbreviation}`,
      description: `Explore property taxes by town in ${county.name} County, ${stateData.state.name}.`,
      type: 'website',
    },
  })
}

export default async function CountyTownsIndexPage({ params }: Props) {
  const { state: stateParam, county: countySegment } = await params
  const state = decodeURIComponent(stateParam)
  const normalizedSlug = countySegment.replace(/-county-property-tax$/, '')
  if (!isValidState(state)) notFound()
  const stateData = getStateData(state)
  if (!stateData) notFound()
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) notFound()

  const shortSlug = getCountyShortSlug(county)
  const publishedTowns = (county.towns || []).filter(t => getTownSlug(t) && isTownPublished(t))
  const count = publishedTowns.length

  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/${countySegment}/towns`
  const countyPageUrl = `${SITE_URL}/${encodeURIComponent(state)}/${countySegment}`
  const countyCalculatorHref = `/${state}/${countySegment}/property-tax-calculator`
  const stateCalculatorHref = `/${state}/property-tax-calculator`

  const directoryItems = publishedTowns.map(town => {
    const effectiveRate = getMetricLatest({ town, county, metricKey: 'effectiveTaxRate' })
    const avgBill = getMetricLatest({ town, county, metricKey: 'averageResidentialTaxBill' })
    return {
      name: getTownDisplayName(town),
      href: buildTownHref(state, shortSlug, getTownSlug(town)),
      rate: effectiveRate?.value ?? (town.avgRate != null ? town.avgRate * 100 : null),
      taxBill: avgBill?.value ?? null,
    }
  })

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateData.state.name, url: `${SITE_URL}/${state}` },
          { name: `${county.name} County`, url: countyPageUrl },
          { name: 'Towns', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <nav className="text-sm text-text-muted mb-4" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="mx-2">→</span>
              <Link href={`/${state}`} className="hover:text-primary">{stateData.state.name}</Link>
              <span className="mx-2">→</span>
              <Link href={`/${state}/${countySegment}`} className="hover:text-primary">{county.name} County</Link>
              <span className="mx-2">→</span>
              <span className="text-text">Towns</span>
            </nav>

            <h1 className="text-4xl font-bold text-text mb-2">
              Property tax towns in {county.name} County, {stateData.state.abbreviation}
            </h1>
            <p className="text-lg text-text-muted mb-6">
              Explore property taxes by town in {county.name} County. Each link goes to a town page
              with rates, average tax bill, and a planning calculator.
            </p>

            <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-text-muted" aria-label="Calculators">
              <Link href={stateCalculatorHref} className="text-text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded">
                {stateData.state.abbreviation} calculator
              </Link>
              <span aria-hidden>·</span>
              <Link href={countyCalculatorHref} className="text-text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded">
                {county.name} County calculator
              </Link>
            </nav>

            <CountyTownsFilter listId="county-towns-list" totalCount={count} showSearchAndSort={count > 15} />
            <CountyTownsLoadMore listId="county-towns-list" totalCount={count} pageSize={20} />
            <CountyTownDirectory listId="county-towns-list" towns={directoryItems} formatTaxBill={v => formatUSD(v)} />

            <div className="mt-12 flex flex-wrap gap-4">
              <Link href={`/${state}/${countySegment}`} className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">
                ← Back to {county.name} County
              </Link>
              <Link href={`/${state}`} className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">
                {stateData.state.name} overview
              </Link>
              <Link href={`/${state}/property-tax-rates`} className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">
                {stateData.state.abbreviation} property tax rates
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
