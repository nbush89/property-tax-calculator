import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import TaxForm from '@/components/TaxForm'
import TaxResults from '@/components/TaxResults'
import { Card } from '@/components/ui/Card'
import LocationFAQ from '@/components/location/LocationFAQ'
import { getStateData, getCountyBySlug, formatUSD } from '@/lib/geo'
import { getCountyNames, getMunicipalitiesByCountyMap } from '@/lib/rates-from-state'
import { slugifyLocation } from '@/utils/locationUtils'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { getCountyFaqData } from '@/data/countyFaqData'
import { getLatestValue, getLatestYear } from '@/lib/data/metrics'
import { resolveSource, resolveSourceUrl } from '@/lib/data/town-helpers'
import CountyTaxTrendsChart from '@/components/CountyTaxTrendsChart'
import {
  selectFeaturedTowns,
  buildCountyTownsIndexHref,
  getTownSlug,
} from '@/lib/links/towns'
import { isTownPublished } from '@/lib/sitemaps'

type Props = {
  params: Promise<{ state: string; county: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countySlug } = await params
  const state = decodeURIComponent(stateParam)
  const normalizedSlug = countySlug.replace(/-county-property-tax$/, '')
  if (!isValidState(state)) return { title: 'State Not Found | Property Tax Calculator' }
  const stateData = getStateData(state)
  if (!stateData) return { title: 'State Not Found | Property Tax Calculator' }
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) return { title: 'County Not Found | Property Tax Calculator' }

  const stateName = stateData.state.name
  const path = `/${encodeURIComponent(state)}/${countySlug}`
  const latestTaxBill = getLatestValue(county.metrics?.averageResidentialTaxBill)
  const latestYear = getLatestYear(county.metrics?.averageResidentialTaxBill)
  const avgTaxBill = latestTaxBill ? formatUSD(latestTaxBill) : 'N/A'
  const yearLabel = latestYear != null ? ` (${latestYear})` : ''

  return buildMetadata({
    title: `${county.name} County ${stateData.state.abbreviation} Property Tax Calculator | Avg Tax Bill${yearLabel}`,
    description: `Estimate property taxes in ${county.name} County, ${stateName}. Includes average residential tax bill data${yearLabel} (${avgTaxBill}) and a planning-focused calculator.`,
    path,
    keywords: `${county.name} County property tax, ${county.name} County ${stateData.state.abbreviation} tax calculator, ${stateName} ${county.name} County property tax rate`,
    openGraph: {
      title: `${county.name} County ${stateData.state.abbreviation} Property Tax Calculator`,
      description: `Estimate property taxes in ${county.name} County, ${stateName}. Average residential tax bill${yearLabel}: ${avgTaxBill}.`,
      type: 'website',
    },
  })
}

export default async function CountyPropertyTaxPage({ params }: Props) {
  const { state: stateParam, county: countySlug } = await params
  const state = decodeURIComponent(stateParam)
  const normalizedSlug = countySlug.replace(/-county-property-tax$/, '')
  if (!isValidState(state)) notFound()
  const stateData = getStateData(state)
  if (!stateData) notFound()
  const county = getCountyBySlug(stateData, normalizedSlug)
  if (!county) notFound()

  const stateName = stateData.state.name
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/${countySlug}`
  const faqs = getCountyFaqData(county.name)
  const latestTaxBill = getLatestValue(county.metrics?.averageResidentialTaxBill)
  const latestYear = getLatestYear(county.metrics?.averageResidentialTaxBill)
  const avgTaxBill = latestTaxBill ? formatUSD(latestTaxBill) : 'N/A'
  const neighborCounties =
    county.neighborCounties
      ?.map(name => getCountyBySlug(stateData, slugifyLocation(name)))
      .filter((c): c is NonNullable<typeof c> => c !== null) || []

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: `${SITE_URL}/${state}` },
          { name: `${county.name} County`, url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Estimate property taxes in ${county.name} County, ${stateName}. Average residential tax bill${latestYear != null ? ` (${latestYear})` : ''}: ${avgTaxBill}.`,
        })}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <nav className="text-sm text-text-muted mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="mx-2">→</span>
              <Link href={`/${state}`} className="hover:text-primary">{stateName}</Link>
              <span className="mx-2">→</span>
              <span className="text-text">{county.name} County</span>
            </nav>

            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-text mb-4">
                {county.name} County, {stateData.state.abbreviation} Property Tax Calculator
              </h1>
              <p className="text-lg text-text-muted">
                Average Residential Tax Bill
                {latestYear != null && <span className="text-text-muted"> ({latestYear})</span>}
                : <span className="font-semibold text-text">{avgTaxBill}</span>
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <Link href={`/${state}`} className="hover:text-primary transition-colors underline">Back to {stateName}</Link>
                <Link href={`/${state}/property-tax-rates`} className="hover:text-primary transition-colors underline">View {stateName} tax rates</Link>
                <Link href={`/${state}/property-tax-calculator`} className="hover:text-primary transition-colors underline">{stateData.state.abbreviation} calculator</Link>
              </div>
            </div>

            <div className="prose prose-lg max-w-none mb-12 text-text-muted">
              {county.copy?.paragraphs ? (
                county.copy.paragraphs.map((paragraph, index) => (
                  <p key={index} className={index === 0 ? 'text-xl leading-relaxed' : ''}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-xl leading-relaxed">
                  Property taxes in <strong>{county.name} County</strong> vary by municipality and
                  reflect local budgets, school district needs, and county services.
                </p>
              )}
              {(() => {
                const latestBill = county.metrics?.averageResidentialTaxBill?.[county.metrics.averageResidentialTaxBill.length - 1]
                if (!latestBill) return null
                const source = resolveSource(stateData, latestBill.sourceRef)
                const sourceUrl = resolveSourceUrl(stateData, latestBill.sourceRef, latestBill.year)
                if (!source) return null
                return (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-text-muted">
                      Source:{' '}
                      <a href={sourceUrl || source.homepageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover underline">
                        {source.publisher} - {source.title} ({latestBill.year})
                      </a>
                    </p>
                  </div>
                )
              })()}
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-text">Calculate Your Property Tax</h2>
                <TaxForm
                  defaultCounty={county.name}
                  countyNames={getCountyNames(stateData)}
                  municipalitiesByCounty={getMunicipalitiesByCountyMap(stateData)}
                />
              </Card>
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-text">Tax Estimate</h2>
                <TaxResults />
              </Card>
            </div>

            {(() => {
              const featuredTowns = selectFeaturedTowns(county, { max: 8, stateSlug: state })
              const townsIndexHref = buildCountyTownsIndexHref(state, countySlug)
              const publishedCount = (county.towns || []).filter(t => getTownSlug(t) && isTownPublished(t)).length
              if (featuredTowns.length === 0 && publishedCount === 0) return null
              return (
                <div className="mb-12">
                  <h2 className="text-2xl font-semibold mb-4 text-text">Towns in {county.name} County</h2>
                  <p className="text-text-muted mb-4">
                    Browse property tax information for municipalities in {county.name} County.
                  </p>
                  {featuredTowns.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {featuredTowns.map(t => (
                        <Link key={t.href} href={t.href} className="block p-4 bg-surface border border-border rounded-lg hover:bg-bg transition-colors text-text">
                          <span className="font-medium">{t.name}</span>
                          <span className="block text-sm text-text-muted mt-1">View town →</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {publishedCount > 0 && (
                    <Link href={townsIndexHref} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
                      Browse all {publishedCount} town page{publishedCount !== 1 ? 's' : ''} in {county.name} County →
                    </Link>
                  )}
                </div>
              )
            })()}

            <CountyTaxTrendsChart county={county} />
            <p className="text-xs text-text-muted mt-4">
              Learn more in our <Link href="/methodology" className="text-primary hover:text-primary-hover underline">methodology</Link>.
            </p>

            <div className="mb-12 flex flex-wrap gap-4">
              <Link href={buildCountyTownsIndexHref(state, countySlug)} className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">
                All towns in {county.name} County
              </Link>
              <Link href={`/${state}`} className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">
                {stateName} overview
              </Link>
              <Link href={`/${state}/property-tax-calculator`} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
                {stateData.state.abbreviation} Property Tax Calculator
              </Link>
              {neighborCounties.slice(0, 4).map(neighbor => (
                <Link key={neighbor.slug} href={`/${state}/${slugifyLocation(neighbor.name)}-county-property-tax`} className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">
                  {neighbor.name} County
                </Link>
              ))}
              <Link href="/faq" className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors">FAQ</Link>
            </div>

            <LocationFAQ faqs={faqs} title={`${county.name} County Property Tax FAQ`} subtitle="Common questions about property taxes in this county" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
