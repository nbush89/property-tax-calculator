import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStateData, formatUSD } from '@/lib/geo'
import { getLatestValue, getLatestYear } from '@/lib/data/metrics'
import { slugifyLocation } from '@/utils/locationUtils'
import { LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Section from '@/components/ui/Section'

export const metadata: Metadata = buildMetadata({
  title: 'New Jersey Property Tax Calculator & County Guide (Planning Estimates)',
  description:
    'Explore New Jersey property taxes by county and town. Use public data for planning estimates and compare local tax trends.',
  path: '/new-jersey',
  keywords:
    'New Jersey property tax, NJ property tax by county, New Jersey county taxes, NJ property tax calculator',
})

export default function NewJerseyPage() {
  const stateData = getStateData('new-jersey')
  if (!stateData) {
    return null
  }

  const pageUrl = `${SITE_URL}/new-jersey`

  // FAQ data for JSON-LD
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
      answer:
        'We use publicly available data from the NJ Division of Taxation (MOD IV Average Residential Tax Report, General & Effective Tax Rates) and the U.S. Census Bureau (ACS 5-year estimates for median home values). All sources are clearly labeled on each page.',
    },
    {
      question: 'What year is the data?',
      answer:
        'Data is explicitly labeled by year on each page. Different datasets update on different schedules, so you may see different years for different metrics. We always show the most recent available data and clearly label the year.',
    },
    {
      question: 'Does this include exemptions?',
      answer:
        'The calculator supports some exemption scenarios (senior freeze, veteran, disabled person), but individual eligibility and amounts vary. Always verify exemption details with your local tax assessor, as exemptions can significantly reduce your actual tax bill.',
    },
  ]

  return (
    <>
      {/* BreadcrumbList schema */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'New Jersey', url: pageUrl },
        ])}
      />
      {/* FAQPage schema */}
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />

      <Header />
      <main className="min-h-screen bg-bg">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-bg-gradient-from to-bg-gradient-to py-16 sm:py-20 lg:py-24">
          <div className="container-page">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
                New Jersey Property Tax Overview
              </h1>
              <p className="mb-8 text-lg text-text-muted sm:text-xl">
                Compare property taxes across New Jersey counties and towns using public data.
                Planning estimates only.
              </p>

              {/* CTAs */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <LinkButton href="/new-jersey/property-tax-calculator" variant="primary" size="lg">
                  Start NJ calculator
                </LinkButton>
                <LinkButton href="#counties" variant="secondary" size="lg">
                  Browse counties
                </LinkButton>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-text-muted">
                Planning estimates only — tax bills depend on assessments, exemptions, and local
                budgets.
              </p>
            </div>
          </div>
        </section>

        {/* Intro Text Block */}
        <section className="pt-10 bg-bg">
          <div className="container-page">
            <div className="mx-auto max-w-3xl">
              <p className="text-lg text-text-muted leading-relaxed mb-0">
                Property taxes in New Jersey can differ significantly from one county to another.
                Browse county-level pages to compare average tax bills, rates, and recent trends
                before drilling down into specific towns or calculations.
              </p>
            </div>
          </div>
        </section>
        {/* County Index Section */}
        <Section
          id="counties"
          title="Explore New Jersey by County"
          subtitle="Compare county averages and year-labeled trends."
          className="bg-bg"
        >
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {stateData.counties.map(county => {
              const countySlug = slugifyLocation(county.name)
              const latestTaxBill = getLatestValue(county.metrics?.averageResidentialTaxBill)
              const latestYear = getLatestYear(county.metrics?.averageResidentialTaxBill)

              return (
                <Card
                  key={county.slug}
                  className="h-full p-4 transition-all hover:shadow-lg hover:border-primary flex flex-col"
                >
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold text-text">{county.name} County</h3>
                    {latestTaxBill && latestYear && (
                      <p className="text-sm text-text-muted">
                        County average ({latestYear}): {formatUSD(latestTaxBill)}
                      </p>
                    )}
                    {county.towns && county.towns.length > 0 && (
                      <p className="mt-2 text-xs text-text-muted">
                        Town pages live: {county.towns.length}{' '}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/new-jersey/${countySlug}-county-property-tax`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                    >
                      View county
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Town Pages Note */}
          <p className="mt-8 text-center text-sm text-text-muted">
            Town pages are being added gradually as data becomes available.
          </p>

          {/* Rates Link */}
          <div className="mt-8 text-center">
            <Link
              href="/new-jersey/property-tax-rates"
              className="text-sm text-text-muted hover:text-primary transition-colors underline"
            >
              View New Jersey property tax rates →
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  )
}
