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
import { buildNjTownHref, getTownSlug, getCountyShortSlug } from '@/lib/links/towns'
import { getTownDisplayName } from '@/utils/locationUtils'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { isTownPublished } from '@/lib/sitemaps'
import CountyTownDirectory from '@/components/location/CountyTownDirectory'
import CountyTownsFilter from '@/components/CountyTownsFilter'
import CountyTownsLoadMore from '@/components/CountyTownsLoadMore'

type Props = {
  params: Promise<{ county: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countySegment } = await params
  const normalizedSlug = countySegment.replace(/-county-property-tax$/, '')
  const stateData = getStateData('new-jersey')
  if (!stateData) return { title: 'State Not Found | Property Tax Calculator' }
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) return { title: 'County Not Found | NJ Property Tax Calculator' }

  const publishedCount = (county.towns || []).filter(t => getTownSlug(t) && isTownPublished(t)).length
  const path = `/new-jersey/${countySegment}/towns`
  return buildMetadata({
    title: `Property Tax Towns in ${county.name} County, NJ`,
    description: `Explore property taxes by town in ${county.name} County, New Jersey. ${publishedCount} town pages with rates and estimates.`,
    path,
    keywords: `${county.name} County towns, ${county.name} County property tax, NJ municipalities`,
    openGraph: {
      title: `Property Tax Towns in ${county.name} County, NJ`,
      description: `Explore property taxes by town in ${county.name} County, New Jersey.`,
      type: 'website',
    },
  })
}

export default async function CountyTownsIndexPage({ params }: Props) {
  const { county: countySegment } = await params
  const normalizedSlug = countySegment.replace(/-county-property-tax$/, '')
  const stateData = getStateData('new-jersey')
  if (!stateData) notFound()
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) notFound()

  const shortSlug = getCountyShortSlug(county)
  const publishedTowns = (county.towns || []).filter(
    t => getTownSlug(t) && isTownPublished(t)
  )
  const count = publishedTowns.length

  const pageUrl = `${SITE_URL}/new-jersey/${countySegment}/towns`
  const countyPageUrl = `${SITE_URL}/new-jersey/${countySegment}`
  const countyCalculatorHref = `/new-jersey/${countySegment}/property-tax-calculator`
  const stateCalculatorHref = '/new-jersey/property-tax-calculator'

  const directoryItems = publishedTowns.map(town => {
    const effectiveRate = getMetricLatest({
      town,
      county,
      metricKey: 'effectiveTaxRate',
    })
    const avgBill = getMetricLatest({
      town,
      county,
      metricKey: 'averageResidentialTaxBill',
    })
    return {
      name: getTownDisplayName(town),
      href: buildNjTownHref(shortSlug, getTownSlug(town)),
      rate: effectiveRate?.value ?? (town.avgRate != null ? town.avgRate * 100 : null),
      taxBill: avgBill?.value ?? null,
    }
  })

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: `${SITE_URL}/new-jersey` },
          { name: `${county.name} County`, url: countyPageUrl },
          { name: 'Towns', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumbs */}
            <nav className="text-sm text-text-muted mb-4" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <span className="mx-2">→</span>
              <Link href="/new-jersey" className="hover:text-primary">
                New Jersey
              </Link>
              <span className="mx-2">→</span>
              <Link href={`/new-jersey/${countySegment}`} className="hover:text-primary">
                {county.name} County
              </Link>
              <span className="mx-2">→</span>
              <span className="text-text">Towns</span>
            </nav>

            <h1 className="text-4xl font-bold text-text mb-2">
              Property tax towns in {county.name} County, NJ
            </h1>
            <p className="text-lg text-text-muted mb-6">
              Explore property taxes by town in {county.name} County. Each link goes to a town page
              with rates, average tax bill, and a planning calculator.
            </p>

            {/* Utility: county + state calculator */}
            <nav
              className="mb-8 flex flex-wrap items-center gap-2 text-sm text-text-muted"
              aria-label="Calculators"
            >
              <Link
                href={stateCalculatorHref}
                className="text-text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              >
                NJ calculator
              </Link>
              <span aria-hidden>·</span>
              <Link
                href={countyCalculatorHref}
                className="text-text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              >
                {county.name} County calculator
              </Link>
            </nav>

            <CountyTownsFilter
              listId="county-towns-list"
              totalCount={count}
              showSearchAndSort={count > 15}
            />
            <CountyTownsLoadMore listId="county-towns-list" totalCount={count} pageSize={20} />

            <CountyTownDirectory
              listId="county-towns-list"
              towns={directoryItems}
              formatTaxBill={v => formatUSD(v)}
            />

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href={`/new-jersey/${countySegment}`}
                className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
              >
                ← Back to {county.name} County
              </Link>
              <Link
                href="/new-jersey"
                className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
              >
                New Jersey overview
              </Link>
              <Link
                href="/new-jersey/property-tax-rates"
                className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors"
              >
                NJ property tax rates
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
