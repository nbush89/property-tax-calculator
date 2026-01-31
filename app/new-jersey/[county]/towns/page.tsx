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
import { buildNjTownHref, getTownSlug } from '@/lib/links/towns'
import { getMetricLatest } from '@/lib/data/town-helpers'
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

  const count = county.towns?.length ?? 0
  const path = `/new-jersey/${countySegment}/towns`
  return buildMetadata({
    title: `${county.name} County Town Property Tax Rates & Calculator Pages`,
    description: `Browse ${count} towns in ${county.name} County, NJ. Compare property tax rates and average tax bills by municipality.`,
    path,
    keywords: `${county.name} County towns, ${county.name} County property tax, NJ municipalities`,
    openGraph: {
      title: `${county.name} County Town Property Tax Rates & Calculator Pages`,
      description: `Browse ${count} towns in ${county.name} County, NJ.`,
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

  const towns = (county.towns || []).filter(t => getTownSlug(t))
  const count = towns.length
  const pageUrl = `${SITE_URL}/new-jersey/${countySegment}/towns`
  const countyPageUrl = `${SITE_URL}/new-jersey/${countySegment}`

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
            {/* Breadcrumb UI */}
            <nav className="text-sm text-text-muted mb-6" aria-label="Breadcrumb">
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
              {county.name} County Town Property Tax Rates & Calculator Pages
            </h1>
            <p className="text-lg text-text-muted mb-8">
              Browse {count} towns in {county.name} County. Select a town for property tax estimates
              and data.
            </p>

            <CountyTownsFilter
              listId="county-towns-list"
              totalCount={count}
              showSearchAndSort={count > 15}
            />
            <CountyTownsLoadMore listId="county-towns-list" totalCount={count} pageSize={20} />

            <div
              id="county-towns-list"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {towns.map((town, index) => {
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
                const rateVal =
                  effectiveRate?.value ?? (town.avgRate != null ? town.avgRate * 100 : null)
                const href = buildNjTownHref(county.slug, getTownSlug(town))
                return (
                  <Link
                    key={getTownSlug(town)}
                    href={href}
                    data-town-card
                    data-town-index={index}
                    data-town-name={town.name}
                    data-town-rate={rateVal != null ? String(rateVal) : ''}
                    data-town-tax-bill={avgBill?.value != null ? String(avgBill.value) : ''}
                    className="block p-4 bg-surface border border-border rounded-lg hover:bg-bg transition-colors"
                  >
                    <span className="font-semibold text-text">{town.name}</span>
                    <div className="mt-2 text-sm text-text-muted">
                      {effectiveRate && (
                        <span>
                          Effective rate: {effectiveRate.value.toFixed(2)}% ({effectiveRate.year})
                        </span>
                      )}
                      {!effectiveRate && rateVal != null && (
                        <span>Rate: {rateVal.toFixed(2)}%</span>
                      )}
                      {avgBill && (
                        <span className="block mt-1">
                          Avg tax bill: {formatUSD(avgBill.value)} ({avgBill.year})
                        </span>
                      )}
                    </div>
                    <span className="block text-sm text-primary mt-2">View town →</span>
                  </Link>
                )
              })}
            </div>

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
