import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStateData } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import {
  getCountyCardHighlight,
  formatResolvedMetricValue,
  formatResolvedMetricYear,
} from '@/lib/metrics/resolveDisplayMetrics'
import { MetricCaveatTrigger } from '@/components/metrics/MetricCaveatTrigger'
import {
  selectStateFeaturedTowns,
  buildCountyTownsIndexHref,
  getTownSlug,
} from '@/lib/links/towns'
import { isTownPublished } from '@/lib/sitemaps'
import { formatStateName, isValidState } from '@/utils/stateUtils'
import { notFound } from 'next/navigation'
import { LinkButton } from '@/components/ui/Button'
import { CtaCalculateLink } from '@/components/cta/CtaCalculateLink'
import { Card } from '@/components/ui/Card'
import Section from '@/components/ui/Section'

type Props = {
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    return { title: 'State Not Found | Property Tax Calculator' }
  }
  const stateName = formatStateName(state)
  const path = `/${encodeURIComponent(state)}`
  return buildMetadata({
    title: `${stateName} Property Tax Calculator & County Guide (Planning Estimates)`,
    description: `Explore ${stateName} property taxes by county and town. Use public data for planning estimates and compare local tax trends.`,
    path,
    keywords: `${stateName} property tax, ${stateName} property tax by county, ${stateName} county taxes, ${stateName} property tax calculator`,
  })
}

export default async function StatePage({ params }: Props) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) {
    notFound()
  }
  const stateData = getStateData(state)
  if (!stateData) {
    notFound()
  }
  const stateName = stateData.state.name
  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}`

  const njSourceAnswer =
    'We use publicly available data from the NJ Division of Taxation (MOD IV Average Residential Tax Report, General & Effective Tax Rates) and the U.S. Census Bureau (ACS 5-year estimates for median home values). All sources are clearly labeled on each page.'

  const faqs = [
    {
      question: 'Are these official tax bills?',
      answer:
        'No, these are planning estimates based on publicly available data. Actual tax bills depend on individual property assessments, exemptions, and local tax decisions. Always verify with your local tax assessor for official amounts.',
    },
    {
      question: 'Why do towns differ from county averages?',
      answer:
        'Property taxes vary by municipality due to differences in local budgets, school district funding, assessment practices, and municipal services. County averages provide context, but individual towns may have significantly different rates.',
    },
    {
      question: 'What data sources are used?',
      answer: state === 'new-jersey' ? njSourceAnswer : `We use publicly available data from state and federal sources. All sources are clearly labeled on each page.`,
    },
    {
      question: 'What year is the data?',
      answer:
        'Data is explicitly labeled by year on each page. Different datasets update on different schedules. We always show the most recent available data and clearly label the year.',
    },
    ...(state === 'new-jersey'
      ? [
          {
            question: 'Does this include exemptions?',
            answer:
              'The calculator supports some exemption scenarios (senior freeze, veteran, disabled person), but individual eligibility and amounts vary. Always verify exemption details with your local tax assessor, as exemptions can significantly reduce your actual tax bill.',
          },
        ]
      : []),
  ]

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: pageUrl },
        ])}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />
      <Header />
      <main className="min-h-screen bg-bg">
        <section className="bg-gradient-to-b from-bg-gradient-from to-bg-gradient-to py-16 sm:py-20 lg:py-24">
          <div className="container-page">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
                {stateName} Property Tax Overview
              </h1>
              <p className="mb-8 text-lg text-text-muted sm:text-xl">
                Compare property taxes across {stateName} counties and towns using public data.
                Planning estimates only.
              </p>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <CtaCalculateLink
                  href={`/${state}/property-tax-calculator`}
                  variant="primary"
                  size="lg"
                  pageType="state"
                  state={state}
                >
                  Start {stateData.state.abbreviation} calculator
                </CtaCalculateLink>
                <LinkButton href="#counties" variant="secondary" size="lg">
                  Browse counties
                </LinkButton>
              </div>
              <p className="text-xs text-text-muted">
                Planning estimates only — tax bills depend on assessments, exemptions, and local
                budgets.
              </p>
            </div>
          </div>
        </section>

        <section className="pt-10 bg-bg">
          <div className="container-page">
            <div className="mx-auto max-w-3xl">
              <p className="text-lg text-text-muted leading-relaxed mb-0">
                Property taxes in {stateName} can differ significantly from one county to another.
                Browse county-level pages to compare averages and trends before drilling down into
                specific towns or calculations.
              </p>
            </div>
          </div>
        </section>

        <Section
          id="counties"
          title={`Explore ${stateName} by County`}
          subtitle="Compare county averages and year-labeled trends."
          className="bg-bg"
        >
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {stateData.counties.map(county => {
              const countySlug = slugifyLocation(county.name)
              const countyRouteSegment = `${countySlug}-county-property-tax`
              const cardMetric = getCountyCardHighlight(state, county.metrics)
              const publishedTownCount = (county.towns || []).filter(
                t => getTownSlug(t) && isTownPublished(t)
              ).length
              const townsHref = buildCountyTownsIndexHref(state, countyRouteSegment)

              return (
                <Card
                  key={county.slug}
                  className="h-full p-4 transition-all hover:shadow-lg hover:border-primary flex flex-col"
                >
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold text-text">{county.name} County</h3>
                    {cardMetric?.show && (
                      <p className="text-sm text-text-muted flex flex-wrap items-center gap-1">
                        <span>
                          {cardMetric.catalog.shortLabel ?? cardMetric.catalog.label}
                          {formatResolvedMetricYear(cardMetric) != null && (
                            <> ({formatResolvedMetricYear(cardMetric)})</>
                          )}
                          : {formatResolvedMetricValue(cardMetric)}
                        </span>
                        <MetricCaveatTrigger
                          semantics={cardMetric.semantics}
                          comparability={cardMetric.comparability}
                          note={cardMetric.note}
                          catalogCaveat={cardMetric.catalog.defaultCaveat}
                        />
                      </p>
                    )}
                    {publishedTownCount > 0 && (
                      <p className="mt-2 text-xs text-text-muted">
                        {publishedTownCount} town page{publishedTownCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/${state}/${countyRouteSegment}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                    >
                      View county
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                    {publishedTownCount > 0 && (
                      <Link
                        href={townsHref}
                        className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                      >
                        View towns
                      </Link>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <p className="mt-8 text-center text-sm text-text-muted">
            Town pages are being added gradually as data becomes available.
          </p>

          {(() => {
            const featuredTowns = selectStateFeaturedTowns(stateData, { max: 10 })
            if (featuredTowns.length === 0) return null
            return (
              <div className="mt-10">
                <h3 className="text-xl font-semibold text-text mb-4">Featured towns</h3>
                <p className="text-sm text-text-muted mb-4">
                  Property tax estimates and data for selected {stateName} municipalities.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {featuredTowns.map(({ name, href, countyName }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="block text-primary hover:text-primary-hover underline font-medium"
                      >
                        {name}
                      </Link>
                      <span className="text-xs text-text-muted"> ({countyName} County)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}

          <div className="mt-8 text-center">
            <Link
              href={`/${state}/property-tax-rates`}
              className="text-sm text-text-muted hover:text-primary transition-colors underline"
            >
              View {stateName} property tax rates →
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  )
}
