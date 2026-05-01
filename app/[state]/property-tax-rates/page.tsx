import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { slugifyLocation } from '@/utils/locationUtils'
import { getStateData } from '@/lib/geo'
import {
  getCountyEffectiveTaxRateYear,
  getTownEffectiveTaxRateYear,
  getMaxEffectiveTaxRateYearInState,
} from '@/lib/rates-from-state'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { getTownSlug } from '@/lib/links/towns'
import { shouldShowCountyAverageTaxBillTrend } from '@/lib/metrics/resolveDisplayMetrics'
import RatesTableClient from '@/components/state/RatesTableClient'
import type { CountyRateRow, TownRateRow } from '@/components/state/RatesTableClient'
import { getLatestValue, getLatestYear } from '@/lib/data/metrics'

type Props = {
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    return { title: 'State Not Found | Property Tax Calculator' }
  }
  const stateData = getStateData(state)
  const stateName = stateData?.state.name ?? formatStateName(state)
  const abbrev = stateData?.state.abbreviation
  const dataYear = stateData
    ? (getMaxEffectiveTaxRateYearInState(stateData) ?? stateData.state.asOfYear)
    : null
  const yearSuffix = dataYear ? ` (${dataYear})` : ''
  const abbrevPrefix = abbrev ? `${abbrev} — ` : ''
  const path = `/${encodeURIComponent(state)}/property-tax-rates`
  return buildMetadata({
    title: `${abbrevPrefix}${stateName} Property Tax Rates by County | Tax Rates${yearSuffix}`,
    description: `View current property tax rates by county and municipality in ${stateName}${dataYear ? ` (${dataYear} data)` : ''}. Compare county and town rates to plan your annual property tax costs.`,
    path,
    keywords: `${stateName} tax rates, ${stateName} county tax rates, property tax rates by county, ${stateName} municipal tax rates`,
  })
}

export default async function StatePropertyTaxRatesPage({ params }: Props) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) notFound()
  const stateData = getStateData(state)
  if (!stateData) notFound()

  const stateName = stateData.state.name
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/property-tax-rates`
  const fallbackYear = stateData.state.asOfYear ?? new Date().getFullYear()
  const latestRateYearInState = getMaxEffectiveTaxRateYearInState(stateData) ?? fallbackYear
  const hasBillData = shouldShowCountyAverageTaxBillTrend(state)

  // Build county rows for the table, sorted by effective rate descending
  const countyRows: CountyRateRow[] = stateData.counties
    .map(c => {
      const rateSeries = c.metrics?.effectiveTaxRate ?? []
      const billSeries = c.metrics?.averageResidentialTaxBill ?? []

      const effectiveRatePct =
        rateSeries.length ? rateSeries[rateSeries.length - 1].value : null
      const rateYear = getCountyEffectiveTaxRateYear(stateData, c.name)

      const avgBill = billSeries.length ? billSeries[billSeries.length - 1].value : null
      const billYear = billSeries.length
        ? getLatestYear(billSeries)
        : null

      // Trend: prefer bill series for NJ, fall back to rate series
      const hasBillTrend = billSeries.length >= 2
      const trend = hasBillTrend
        ? billSeries.slice(-5).map(p => p.value)
        : rateSeries.slice(-5).map(p => p.value)

      const countySlug = c.slug || slugifyLocation(c.name)

      // Build town rows — include all towns that have a rate, linked only if published
      const towns: TownRateRow[] = (c.towns ?? [])
        .filter(t => {
          const rate = t.metrics?.effectiveTaxRate?.length
            ? t.metrics.effectiveTaxRate[t.metrics.effectiveTaxRate.length - 1].value
            : t.avgRate
          return rate != null
        })
        .map(t => {
          const rateSeries = t.metrics?.effectiveTaxRate ?? []
          // Series values are stored in percent form (e.g. 0.710 = 0.710%).
          // avgRate is a legacy decimal (e.g. 0.0071 = 0.71%) and needs * 100.
          const ratePct = rateSeries.length
            ? rateSeries[rateSeries.length - 1].value           // already percent
            : typeof t.avgRate === 'number' ? t.avgRate * 100 : null  // decimal → percent
          const rateYear = getTownEffectiveTaxRateYear(stateData, c.name, t.name)
          const slug = getTownSlug(t)
          const published = slug != null && isTownPublished(t)
          return {
            name: t.displayName ?? t.name,
            href: published ? `/${state}/${countySlug}/${slug}-property-tax` : null,
            effectiveRatePct: ratePct,
            rateYear,
            medianBill: null, // available at town level but omitted for now for brevity
          }
        })
        .sort((a, b) => {
          // Sort towns: published first, then by rate desc
          if (a.href && !b.href) return -1
          if (!a.href && b.href) return 1
          return (b.effectiveRatePct ?? 0) - (a.effectiveRatePct ?? 0)
        })

      return {
        rank: 0, // filled in after sort
        name: c.name,
        countyHref: `/${state}/${countySlug}-county-property-tax`,
        effectiveRatePct,
        rateYear,
        avgBill,
        billYear,
        trend,
        towns,
      }
    })
    .sort((a, b) => (b.effectiveRatePct ?? 0) - (a.effectiveRatePct ?? 0))
    .map((c, i) => ({ ...c, rank: i + 1 }))

  const hasAnyRates = countyRows.some(c => c.effectiveRatePct != null)

  const faqs = [
    {
      question: 'What does an effective property tax rate mean?',
      answer:
        'An effective property tax rate is a percentage used for comparison across places. Your actual bill depends on your assessed value, exemptions, and local levy.',
    },
    {
      question: 'Why do rates differ across municipalities in the same county?',
      answer:
        'Municipal, school district, and special district budgets vary, and each locality sets its own levy rate based on its assessed value base.',
    },
    {
      question: 'Are these rates official?',
      answer:
        'Rates are derived from publicly available sources and labeled by year, but this site provides planning estimates only — always verify with your local assessor.',
    },
  ]

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: `${SITE_URL}/${state}` },
          { name: 'Property Tax Rates', url: pageUrl },
        ])}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
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
              <span className="text-text">Property Tax Rates</span>
            </nav>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  {stateName} Property Tax Rates by County
                </h1>
                <p className="mt-1 text-sm text-text-muted">
                  County and municipal effective rates, ranked highest to lowest.{' '}
                  Latest data up to {latestRateYearInState}. Click a county row to browse towns.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/${state}/property-tax-calculator`}
                  className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap"
                >
                  Estimate my {stateData.state.abbreviation} tax →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <section className="pt-8 pb-10 bg-bg">
          <div className="container-page">
            {!hasAnyRates ? (
              <div className="rounded-lg border border-border bg-surface p-6 text-center text-text-muted">
                <p>
                  County rate data for {stateName} is being added. Check back soon or use the
                  calculator for estimates.
                </p>
                <Link
                  href={`/${state}/property-tax-calculator`}
                  className="mt-4 inline-block data-link"
                >
                  Go to {stateName} calculator →
                </Link>
              </div>
            ) : (
              <RatesTableClient
                stateSlug={state}
                stateName={stateName}
                counties={countyRows}
                hasBillData={hasBillData}
              />
            )}
          </div>
        </section>

        {/* FAQ + sources */}
        <section className="border-t border-border py-8 bg-bg">
          <div className="container-page">
            <h2 className="text-lg font-semibold text-text mb-5">FAQ</h2>
            <dl className="space-y-5">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <dt className="font-medium text-text mb-1">{faq.question}</dt>
                  <dd className="text-sm text-text-muted leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
            {state === 'new-jersey' && (
              <p className="mt-8 text-xs text-text-muted border-t border-border pt-4">
                Sources: New Jersey Division of Taxation (municipal/county tax rate publications),
                U.S. Census Bureau (where noted).
              </p>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
