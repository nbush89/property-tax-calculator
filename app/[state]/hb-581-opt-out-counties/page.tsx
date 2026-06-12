import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { Divider } from '@/components/ui/Divider'
import { AccordionItem } from '@/components/ui/Accordion'

type Props = {
  params: Promise<{ state: string }>
}

// Only render this page for Georgia. Other states get a 404.
export async function generateStaticParams() {
  return [{ state: 'georgia' }]
}

/**
 * /georgia/hb-581-opt-out-counties
 *
 * Editorial page targeting GA HB 581 search queries (e.g., "did Fulton opt
 * out of HB 581", "HB 581 floating homestead exemption Georgia"). High-leverage
 * because (1) the topic is genuinely confusing for most GA homeowners, (2)
 * coverage in news/blog form is thin and county-specific tracking is even
 * thinner, and (3) the opt-out list maps directly to the metros where our
 * calculator already has data.
 */

const HB581_OPT_OUT: Array<{
  countyName: string
  countySlug: string
  countyGovOptedOut: boolean
  schoolDistrictOptedOut: boolean
  /** Approximate 2024 median single-family assessed value (for the worked example). */
  exampleHomeFmv: number
  /** Latest county-level effective rate as percent (e.g. 0.88 = 0.88%). */
  effectiveRatePct: number
}> = [
  {
    countyName: 'Fulton',
    countySlug: 'fulton',
    countyGovOptedOut: true,
    schoolDistrictOptedOut: true,
    exampleHomeFmv: 425000,
    effectiveRatePct: 0.88,
  },
  {
    countyName: 'DeKalb',
    countySlug: 'dekalb',
    countyGovOptedOut: true,
    schoolDistrictOptedOut: true,
    exampleHomeFmv: 350000,
    effectiveRatePct: 0.94,
  },
  {
    countyName: 'Gwinnett',
    countySlug: 'gwinnett',
    countyGovOptedOut: true,
    schoolDistrictOptedOut: true,
    exampleHomeFmv: 375000,
    effectiveRatePct: 0.95,
  },
  {
    countyName: 'Cobb',
    countySlug: 'cobb',
    countyGovOptedOut: true,
    schoolDistrictOptedOut: true,
    exampleHomeFmv: 425000,
    effectiveRatePct: 0.67,
  },
  {
    countyName: 'Douglas',
    countySlug: 'douglas',
    countyGovOptedOut: true,
    schoolDistrictOptedOut: true,
    exampleHomeFmv: 359000,
    effectiveRatePct: 0.74,
  },
]

function buildFaqs(): { question: string; answer: string }[] {
  return [
    {
      question: 'What is HB 581 and when did it take effect?',
      answer:
        "Georgia House Bill 581, known as the Save Our Homes Act, took effect on January 1, 2025. It creates a statewide floating homestead exemption that caps annual growth in a homestead's taxable value at the rate of inflation (measured by the Consumer Price Index). The law was framed as protection for long-term homeowners against rapid assessment growth in hot real-estate markets.",
    },
    {
      question: 'Which Georgia counties opted out of HB 581?',
      answer:
        'All four core metro Atlanta counties — Fulton, DeKalb, Gwinnett, and Cobb — formally opted out for tax year 2025, including each of their school districts. Douglas County also opted out across the board (county government, school district, and every incorporated city). Many other Georgia counties opted out as well, often in mixed combinations — for example a school board opting out while the county commission did not, or a city staying in while its county opted out. Because GA does not maintain a central public list, status outside the counties on this page must be verified through each county Board of Tax Assessors.',
    },
    {
      question: 'Where is opt-out status published for each county?',
      answer:
        "Opt-out status is published by each county individually — typically on the Board of Tax Assessors website and in county commission meeting minutes from late 2024. The state does not maintain a central public-facing list. The five counties covered on this page (Fulton, DeKalb, Gwinnett, Cobb, Douglas) have confirmed status reflected in the calculator. Status for other counties is available through county-level sources, and opt-out decisions can be revisited annually.",
    },
    {
      question: 'What does opt-out mean for my property tax bill?',
      answer:
        'If your county opted out, the HB 581 floating homestead cap does not apply. Your assessed value can rise with market appreciation, subject only to the existing 40% statewide assessment ratio. You still receive the traditional $2,000 statewide homestead exemption on your primary residence, and any local senior, veteran, or disability exemptions you already qualified for. Long-term, this means homeowners in opted-out counties may see larger year-over-year tax bill increases during rapid market appreciation than homeowners in opted-in counties.',
    },
    {
      question: 'What rationale did the metro counties cite for opting out?',
      answer:
        "The public rationale across all four metro county commissions was substantially similar: HB 581 caps revenue growth without providing a state-level reimbursement mechanism. Local governments and school districts that rely on property tax appreciation to fund schools and services projected structural shortfalls over time without the cap removed. The Fulton and DeKalb school boards specifically cited the impact of capped school millage on operating budgets in their adopted resolutions.",
    },
    {
      question: 'Can my county reverse its decision in future years?',
      answer:
        'Yes. HB 581 opt-out and opt-in decisions can be revisited each year through the same public-hearing process. If a future commission changes course, or if a future state legislative session modifies the framework, the floating homestead would apply going forward. The four metro Atlanta counties are likely to revisit annually given how visible the issue has become; check the relevant Board of Tax Assessors site each spring before annual notices mail.',
    },
    {
      question: 'What protections remain for homeowners in opted-out counties?',
      answer:
        'Three mechanisms remain unchanged by the opt-out. The $2,000 statewide standard homestead exemption applies to primary residences; local senior age-65, disability, and veteran exemptions continue to apply where homeowners qualify (these are typically larger than the statewide $2,000 minimum); and the appeal process remains available — Georgia homeowners have 45 days from the date on their annual assessment notice to file Form PT-311A. Cobb and DeKalb have particularly large senior exemptions, Fulton stacks additional homestead amounts inside the City of Atlanta, and Douglas exempts qualifying age-62 seniors from the school portion of the bill entirely (conditions apply).',
    },
  ]
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params
  if (state !== 'georgia') return { title: 'Not Found | Property Tax Calculator' }
  const path = '/georgia/hb-581-opt-out-counties'
  return buildMetadata({
    title: 'Did Your Georgia County Opt Out of HB 581? (Fulton, DeKalb, Gwinnett, Cobb, Douglas) | 2025',
    absoluteTitle: true,
    description:
      "Georgia's HB 581 floating homestead exemption took effect Jan 1, 2025 — but Fulton, DeKalb, Gwinnett, Cobb, and Douglas all opted out. Here's what that means for your property tax bill, county by county.",
    path,
    keywords:
      'HB 581 Georgia, HB 581 opt out, Georgia floating homestead exemption, Save Our Homes Act Georgia, Fulton HB 581, DeKalb HB 581, Gwinnett HB 581, Cobb HB 581, Douglas HB 581, Georgia property tax 2025',
    openGraph: {
      title: 'Georgia HB 581 — Which Counties Opted Out (and What That Means)',
      description:
        'Fulton, DeKalb, Gwinnett, Cobb, and Douglas all opted out of the statewide floating homestead. Here is the breakdown plus what each opt-out means for homeowners.',
      type: 'article',
    },
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Hb581OptOutPage({ params }: Props) {
  const { state } = await params
  if (state !== 'georgia') notFound()

  const pageUrl = `${SITE_URL}/georgia/hb-581-opt-out-counties`
  const faqs = buildFaqs()

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Georgia', url: `${SITE_URL}/georgia` },
          { name: 'HB 581 opt-out counties', url: pageUrl },
        ])}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />

      <Header />
      <main className="min-h-screen bg-bg">
        <div className="page-header-bar">
          <div className="container-content">
            <nav className="text-sm text-text-muted mb-3" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <span className="mx-2">→</span>
              <Link href="/georgia" className="hover:text-primary transition-colors">
                Georgia
              </Link>
              <span className="mx-2">→</span>
              <span className="text-text">HB 581 opt-out counties</span>
            </nav>
            <h1 className="text-3xl font-semibold tracking-tight text-text mb-3">
              Did your Georgia county opt out of HB 581?
            </h1>
            <p className="text-base text-text-muted max-w-prose leading-relaxed">
              Georgia House Bill 581 — the Save Our Homes Act — took effect January 1, 2025 and
              created a statewide floating homestead exemption that caps annual growth in a
              homestead&apos;s taxable value at inflation. But counties and school districts
              could opt out via public hearing, and a large share of them did — including all
              five Georgia counties our calculator currently covers. Below is the confirmed
              status for those five, plus what opting out means for your bill.
            </p>
          </div>
        </div>

        <div className="container-content py-8">
          {/* Quick lookup table */}
          <section className="mb-10 scroll-mt-24" aria-labelledby="lookup-heading">
            <h2 id="lookup-heading" className="text-2xl font-semibold text-text mb-2">
              Quick lookup — Atlanta-area counties (confirmed)
            </h2>
            <p className="text-sm text-text-muted mb-4 measure">
              These are the five Georgia counties our calculator currently covers. Status for
              each was confirmed from Board of Tax Assessors public records and county
              commission minutes. Many other Georgia counties also opted out — see below for
              how to check yours.
            </p>
            <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {HB581_OPT_OUT.map(c => {
                const bothOut = c.countyGovOptedOut && c.schoolDistrictOptedOut
                return (
                  <div
                    key={c.countySlug}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-3 p-5"
                  >
                    <div>
                      <Link
                        href={`/georgia/${c.countySlug}`}
                        className="text-lg font-semibold text-primary hover:text-primary-hover"
                      >
                        {c.countyName} County
                      </Link>
                      <p className="text-sm text-text-muted mt-1">
                        {bothOut
                          ? 'County government and school district both opted out for 2025'
                          : c.countyGovOptedOut
                            ? 'County government opted out; school district remains opted in'
                            : 'School district opted out; county government remains opted in'}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          bothOut
                            ? 'bg-amber-50 text-amber-800 ring-amber-200'
                            : 'bg-bg text-text-muted ring-border'
                        }`}
                      >
                        {bothOut ? 'Opted out' : 'Partial opt-out'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-text-muted mt-3 measure">
              Status confirmed for tax year 2025. Opt-out decisions vary widely across
              Georgia&apos;s 159 counties and the state does not maintain a central list — for
              any county outside this set, check your county&apos;s Board of Tax Assessors or
              county commission minutes from late 2024.
            </p>
          </section>

          <Divider />

          {/* What HB 581 actually does */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="what-heading">
            <h2 id="what-heading" className="text-2xl font-semibold text-text mb-4">
              What HB 581 actually does — and what opting out changes
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                Georgia&apos;s standard formula multiplies fair market value by the 40%
                constitutional assessment ratio, subtracts exemptions, and applies the combined
                millage rate from your county, city, and school district. In a rising market —
                metro Atlanta median home values rose roughly 40% from 2020 to 2024 — that
                pass-through pushed bills up nearly as fast as values, even with stable millage.
                HB 581 was designed to interrupt that: for homesteaded primary residences in
                opted-in jurisdictions, year-over-year growth in taxable value is capped at
                inflation (CPI), typically 2–4%. The cap resets when the property changes
                hands.
              </p>
              <p>
                <strong className="text-text">
                  Opting out cancels the cap.
                </strong>{' '}
                Where a county or school district opted out, taxable value can rise with the
                market each year, subject only to the 40% assessment ratio. The standard
                $2,000 statewide homestead exemption still applies, and so do any local senior,
                veteran, or disability exemptions you already qualify for. Mechanically, the
                bill works exactly as it did before HB 581 — only the cap is absent.
              </p>
            </div>
          </section>

          <Divider />

          {/* Rationale cited */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="why-heading">
            <h2 id="why-heading" className="text-2xl font-semibold text-text mb-4">
              Rationale cited for opting out
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                Counties and school districts that opted out generally cited revenue
                mechanics. Local governments and school districts in Georgia are
                constitutionally required to balance budgets, and they rely on year-over-year
                growth in the assessment base to fund salaries, contracts, and capital
                projects. HB 581 caps that growth at inflation, and the law includes no
                state-level mechanism to reimburse the difference.
              </p>
              <p>
                School districts cited this dynamic most often in public hearings. Teacher
                salaries and operating costs have historically risen faster than CPI, so
                capping revenue growth at inflation creates a divergence between cost
                growth and revenue growth. Public statements from the Fulton and DeKalb
                school boards framed the alternatives as opting out, or remaining opted in
                and later adjusting through service reductions or millage-rate increases
                that require rollback-rate public hearings.
              </p>
            </div>
          </section>

          <Divider />

          {/* Effect on bills */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="impact-heading">
            <h2 id="impact-heading" className="text-2xl font-semibold text-text mb-4">
              Effect on tax bills in opted-out counties
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                In an opted-out county, taxable value continues to rise with market
                appreciation — the CPI cap does not apply. Other protections from before HB 581
                remain in place: the $2,000 statewide homestead exemption on primary
                residences, plus any local senior age-65, veteran, disability, or pre-existing
                floating homesteads that homeowners already qualified for. Cobb and DeKalb
                offer large senior exemptions; Fulton stacks additional homestead amounts
                inside the City of Atlanta; Douglas exempts qualifying age-62 seniors from
                the school millage entirely (conditions apply, and the school portion is the
                largest single component of the bill). None
                of those mechanisms were modified by the opt-out.
              </p>
              <p>
                The effect varies with length of ownership. A homeowner in an opted-in county
                who has held the same residence for many years would see taxable value reset
                to inflation-only growth from 2025 forward. In an opted-out county, taxable
                value continues to track market-rate assessment growth annually, offset by
                whatever county-level exemptions the homeowner qualifies for.
              </p>
              <p>
                Property tax appeals are unchanged by HB 581 status. Georgia homeowners
                continue to have 45 days from the date on the annual assessment notice to file
                Form PT-311A. The{' '}
                <Link href="/georgia/property-tax-appeal-calculator" className="data-link">
                  Georgia property tax appeal calculator
                </Link>{' '}
                covers the appeal math and process.
              </p>
            </div>
          </section>

          <Divider />

          {/* Where status is published */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="verify-heading">
            <h2 id="verify-heading" className="text-2xl font-semibold text-text mb-4">
              Where opt-out status is published
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                Opt-out decisions can be revisited annually. They are adopted through public
                hearings (typically November or December for the following tax year) and
                published in three places:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  County Board of Tax Assessors sites — opt-out resolutions are posted when
                  adopted. Fulton, DeKalb, Gwinnett, and Cobb maintain searchable resolution
                  archives.
                </li>
                <li>
                  County commission meeting minutes from late prior year, which include the
                  public hearing record for opt-out resolutions.
                </li>
                <li>
                  Local news coverage from the Atlanta Journal-Constitution, Georgia Public
                  Broadcasting, and county-level outlets.
                </li>
              </ul>
              <p>
                When a county reverses an opt-out, the floating homestead applies going
                forward, but the cap resets to that year&apos;s assessed value as the new
                floor — it does not back-date to earlier values.
              </p>
            </div>
          </section>

          <Divider />

          {/* FAQ — accordions so the page doesn't stretch with answers users haven't asked yet.
              Native <details>/<summary> via AccordionItem keeps answers in the DOM for SEO and
              the FAQ JSON-LD above already serializes the full Q&A set for Google's FAQ rich
              result. First item defaults open so the section doesn't look empty. */}
          <section className="mb-12 mt-10 scroll-mt-24" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-semibold text-text mb-4">
              Frequently asked questions
            </h2>
            <div className="max-w-3xl space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  title={faq.question}
                  defaultOpen={i === 0}
                  headingLevel={3}
                >
                  <p className="text-sm leading-relaxed measure">{faq.answer}</p>
                </AccordionItem>
              ))}
            </div>
          </section>

          {/* Sources */}
          <section
            className="mb-12 border-t border-border pt-8 scroll-mt-24"
            aria-labelledby="sources-heading"
          >
            <h2 id="sources-heading" className="text-2xl font-semibold mb-4 text-text">
              Sources
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-text-muted measure">
              <li>
                Georgia General Assembly — House Bill 581 (2024 Session). Text and implementation
                details at{' '}
                <a
                  href="https://www.legis.ga.gov/legislation/65771"
                  className="data-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  legis.ga.gov
                </a>
                .
              </li>
              <li>
                Georgia Department of Revenue — Property Tax Administration guidance.{' '}
                <a
                  href="https://dor.georgia.gov/local-government-services"
                  className="data-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  dor.georgia.gov
                </a>
                .
              </li>
              <li>
                County Board of Tax Assessors public records: Fulton, DeKalb, Gwinnett, Cobb,
                and Douglas — opt-out resolutions adopted Nov 2024–Feb 2025.
              </li>
              <li>
                U.S. Census Bureau ACS 5-year estimates — median home values and median real estate
                taxes paid, used for the worked examples and effective-rate references.
              </li>
            </ul>
            <p className="text-xs text-text-muted mt-6 italic">
              This page provides editorial context and planning estimates only. Opt-out status and
              tax mechanics can change year to year. For the official position for any specific
              year, contact your county Board of Tax Assessors directly.
            </p>
          </section>

          {/* Related */}
          <section className="mb-10 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-text mb-3">Related tools</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/georgia/property-tax-calculator" className="text-sm data-link">
                Georgia property tax calculator
              </Link>
              <Link href="/georgia/property-tax-appeal-calculator" className="text-sm data-link">
                Georgia property tax appeal calculator
              </Link>
              <Link href="/georgia/property-tax-rates" className="text-sm data-link">
                Georgia rates by county
              </Link>
              <Link href="/georgia" className="text-sm data-link">
                Georgia overview
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
