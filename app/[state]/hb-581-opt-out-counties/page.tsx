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
import { getStateData } from '@/lib/geo'
import type { StateData, CountyData, TownData } from '@/lib/data/types'

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
 * thinner, and (3) status is now data-driven — adding new counties to
 * georgia.json automatically extends the lookup grid.
 */

// ─── Derived status types ─────────────────────────────────────────────────────

type JurisdictionRow = {
  label: string
  // Sublabel surfaces useful context (e.g., independent school district name)
  sublabel?: string
  // true = stayed in HB 581 (cap applies). false = opted out (traditional math).
  // null = status not yet recorded (display as "unknown").
  optedIn: boolean | null
}

type CountyStatus = {
  countyName: string
  countySlug: string
  // 'fully-out' | 'fully-in' | 'mixed' | 'unknown'
  overallStatus: 'fully-out' | 'fully-in' | 'mixed' | 'unknown'
  jurisdictions: JurisdictionRow[]
}

// ─── Status derivation from state data ────────────────────────────────────────

/**
 * Threshold for treating a town's school mills as belonging to an INDEPENDENT
 * school district rather than the county-wide one. Same-source mills typically
 * round to identical 3-decimal values; differences above 0.1 mills indicate a
 * separate taxing district (e.g., Atlanta Public Schools vs. Fulton Co Schools).
 */
const INDEPENDENT_SCHOOL_MILL_DELTA = 0.1

/**
 * Determine whether a town's school mills represent an independent district
 * (vs. the county-wide school district).
 */
function townHasIndependentSchool(town: TownData, countySchoolMills: number | undefined): boolean {
  if (countySchoolMills == null) return false
  const m = town.metrics?.millage?.[0]
  if (m?.school == null) return false
  return Math.abs(m.school - countySchoolMills) > INDEPENDENT_SCHOOL_MILL_DELTA
}

function buildCountyStatus(county: CountyData): CountyStatus {
  const countyMill = county.metrics?.millage?.[0]
  const jurisdictions: JurisdictionRow[] = []

  // County BOC row
  if (countyMill?.hb581OptOut?.county != null) {
    jurisdictions.push({
      label: `${county.name} County government`,
      optedIn: !countyMill.hb581OptOut.county,
    })
  } else {
    jurisdictions.push({
      label: `${county.name} County government`,
      optedIn: null,
    })
  }

  // County school district row
  if (countyMill?.hb581OptOut?.school != null) {
    jurisdictions.push({
      label: `${county.name} County Schools`,
      optedIn: !countyMill.hb581OptOut.school,
    })
  } else {
    jurisdictions.push({
      label: `${county.name} County Schools`,
      optedIn: null,
    })
  }

  // Per-city + per-independent-school-district rows
  const countySchoolMills = countyMill?.school
  for (const town of county.towns ?? []) {
    const townMill = town.metrics?.millage?.[0]
    if (!townMill) continue

    // City row — only when the town actually has its own city millage
    // (CDPs and unincorporated places don't have a city portion)
    if ((townMill.city ?? 0) > 0 && townMill.hb581OptOut?.city != null) {
      jurisdictions.push({
        label: `City of ${town.name}`,
        optedIn: !townMill.hb581OptOut.city,
      })
    }

    // Independent school district row — when the town's school mills
    // differ materially from the county-wide rate, this town is served by
    // an independent district. The school flag on the town entry refers to
    // THAT district, not the county's.
    if (townHasIndependentSchool(town, countySchoolMills) && townMill.hb581OptOut?.school != null) {
      // Look up the canonical independent district name where we know it;
      // fall back to a generic "{Town} City Schools" label.
      const districtName =
        INDEPENDENT_SCHOOL_DISTRICT_DISPLAY[town.name] ?? `${town.name} City Schools`
      jurisdictions.push({
        label: districtName,
        sublabel: `Independent school district serving ${town.name}`,
        optedIn: !townMill.hb581OptOut.school,
      })
    }
  }

  // Determine overall status
  const known = jurisdictions.filter(j => j.optedIn !== null)
  let overallStatus: CountyStatus['overallStatus']
  if (known.length === 0) {
    overallStatus = 'unknown'
  } else if (known.every(j => j.optedIn === false)) {
    overallStatus = 'fully-out'
  } else if (known.every(j => j.optedIn === true)) {
    overallStatus = 'fully-in'
  } else {
    overallStatus = 'mixed'
  }

  return {
    countyName: county.name,
    countySlug: county.slug,
    overallStatus,
    jurisdictions,
  }
}

/**
 * Canonical display names for independent school districts in our coverage.
 * Used as the row label on the status grid when a town's school mills diverge
 * from the county-wide rate. Extend as we add coverage for cities with
 * independent districts (Buford, Bremen, Calhoun, etc.).
 */
const INDEPENDENT_SCHOOL_DISTRICT_DISPLAY: Record<string, string> = {
  Atlanta: 'Atlanta Public Schools',
  Decatur: 'City Schools of Decatur',
  Marietta: 'Marietta City Schools',
}

function buildAllCountyStatus(stateData: StateData): CountyStatus[] {
  return stateData.counties.map(buildCountyStatus)
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

function statusBadgeClasses(status: CountyStatus['overallStatus']): string {
  switch (status) {
    case 'fully-out':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case 'mixed':
      return 'bg-blue-50 text-blue-800 ring-blue-200'
    case 'fully-in':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'unknown':
    default:
      return 'bg-bg text-text-muted ring-border'
  }
}

function statusBadgeLabel(status: CountyStatus['overallStatus']): string {
  switch (status) {
    case 'fully-out':
      return 'Fully opted out'
    case 'mixed':
      return 'Mixed — some out, some in'
    case 'fully-in':
      return 'Fully opted in (cap applies)'
    case 'unknown':
    default:
      return 'Status pending'
  }
}

// ─── FAQ builder ──────────────────────────────────────────────────────────────

function buildFaqs(statuses: CountyStatus[]): { question: string; answer: string }[] {
  const fullyOut = statuses.filter(s => s.overallStatus === 'fully-out').map(s => s.countyName)
  const mixed = statuses.filter(s => s.overallStatus === 'mixed').map(s => s.countyName)
  const fullyIn = statuses.filter(s => s.overallStatus === 'fully-in').map(s => s.countyName)

  const fullyOutList = fullyOut.length > 0 ? fullyOut.join(', ') : 'none yet'
  const mixedList = mixed.length > 0 ? mixed.join(', ') : 'none yet'
  const fullyInList = fullyIn.length > 0 ? fullyIn.join(', ') : 'none yet'

  return [
    {
      question: 'What is HB 581 and when did it take effect?',
      answer:
        "Georgia House Bill 581, known as the Save Our Homes Act, took effect on January 1, 2025. It creates a statewide floating homestead exemption that caps annual growth in a homestead's taxable value at the rate of inflation (measured by the Consumer Price Index — published by the State Revenue Commissioner each January). The 2025 inflation index rate was 0%; the 2026 rate is 2.7%. The law was framed as protection for long-term homeowners against rapid assessment growth in hot real-estate markets.",
    },
    {
      question: 'Which Georgia counties opted out of HB 581?',
      answer: `Of the Georgia counties our calculator currently covers: ${fullyOutList} are fully opted out (county government, school district, and every incorporated city); ${mixedList} have a mixed status (one or more jurisdictions opted out, others stayed in); ${fullyInList} are fully opted in (the cap applies to the entire bill). Across all 159 Georgia counties, the Tax Foundation reports 316 local government entities opted out — 47 county governments, 123 school districts, and 141 cities. Mixed-status counties are common, especially where school boards opted out while county commissions stayed in.`,
    },
    {
      question: 'What does "mixed" status actually mean for my bill?',
      answer:
        "In a mixed county, HB 581's floating cap applies to some portions of your bill but not others. The most common mixed pattern is schools-only-out: the county government and your city stayed in HB 581 (so those portions of your bill are capped at 2024 base year × inflation), but the school district opted out (so the school portion uses traditional math — 40% assessment ratio applied to current market value). Henry, Paulding, and similar counties follow this pattern. Your annual notice from the county Board of Tax Assessors should itemize which portion uses which math.",
    },
    {
      question: 'Where is opt-out status published for each county?',
      answer:
        'Opt-out status is published by each county individually — typically on the Board of Tax Assessors website and in county commission meeting minutes from late 2024. The state does not maintain a central public-facing list. The counties on this page have confirmed status from Board of Tax Assessors public records, county commission minutes, school board votes, and city council resolutions. Status for other counties is available through county-level sources, and opt-out decisions can be revisited annually for tax years 2026 through 2029.',
    },
    {
      question: 'What does opt-out mean for my property tax bill?',
      answer:
        'If your county (or school district, or city) opted out, the HB 581 floating homestead cap does not apply to that portion of your bill. That portion uses traditional math: fair market value × 40% assessment ratio, minus the standard $2,000 statewide homestead exemption, times the relevant millage rate. Long-term, this means homeowners in opted-out jurisdictions may see larger year-over-year tax-bill increases during rapid market appreciation than homeowners in jurisdictions that stayed in HB 581. Local senior, veteran, and disability exemptions you already qualify for continue to apply regardless of HB 581 status.',
    },
    {
      question: 'What rationale did metro counties cite for opting out?',
      answer:
        "The public rationale across opted-out metro commissions was substantially similar: HB 581 caps revenue growth without providing a state-level reimbursement mechanism. Local governments and school districts that rely on year-over-year growth in the assessment base to fund salaries, contracts, and capital projects projected structural shortfalls without that growth. The Fulton, DeKalb, and Henry school boards cited the impact of capped school millage on operating budgets in their adopted resolutions, often noting that teacher salaries and operating costs typically rise faster than CPI.",
    },
    {
      question: 'Can my county reverse its decision in future years?',
      answer:
        'Yes. HB 581 opt-out and opt-in decisions can be revisited each year through the same public-hearing process. HB 92 (signed April 2025) extended the rescission window through tax year 2029, so any local government that initially opted out can change course annually until then. Check the relevant Board of Tax Assessors site each spring before annual notices mail.',
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
  const stateData = getStateData(state)
  const countyNames = stateData?.counties.map(c => c.name).join(', ') ?? 'Atlanta-area counties'
  const path = '/georgia/hb-581-opt-out-counties'
  return buildMetadata({
    title: `Did Your Georgia County Opt Out of HB 581? (${countyNames}) | 2025`,
    absoluteTitle: true,
    description:
      "Georgia's HB 581 floating homestead exemption took effect Jan 1, 2025 — and counties, school districts, and cities each made their own opt-out decision. Confirmed per-jurisdiction status for Atlanta-area counties, plus what mixed status means for your bill.",
    path,
    keywords:
      'HB 581 Georgia, HB 581 opt out, Georgia floating homestead exemption, Save Our Homes Act Georgia, Fulton HB 581, DeKalb HB 581, Gwinnett HB 581, Cobb HB 581, Douglas HB 581, Henry HB 581, Paulding HB 581, Rockdale HB 581, Georgia property tax 2025',
    openGraph: {
      title: 'Georgia HB 581 — Which Counties (and Cities and School Districts) Opted Out',
      description:
        'Per-jurisdiction confirmed status for Atlanta-area counties, plus what fully-out, mixed, and fully-in status each mean for your annual tax bill.',
      type: 'article',
    },
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Hb581OptOutPage({ params }: Props) {
  const { state } = await params
  if (state !== 'georgia') notFound()

  const stateData = getStateData(state)
  if (!stateData) notFound()
  const statuses = buildAllCountyStatus(stateData)

  const pageUrl = `${SITE_URL}/georgia/hb-581-opt-out-counties`
  const faqs = buildFaqs(statuses)

  // Counts for the intro paragraph
  const fullyOutCount = statuses.filter(s => s.overallStatus === 'fully-out').length
  const mixedCount = statuses.filter(s => s.overallStatus === 'mixed').length
  const fullyInCount = statuses.filter(s => s.overallStatus === 'fully-in').length

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
              homestead&apos;s taxable value at inflation. Counties, school districts, and
              cities could each opt out independently via public hearing, and many did — often
              in mixed combinations. Of the {statuses.length} Georgia counties our calculator
              currently covers, {fullyOutCount} are fully opted out, {mixedCount}{' '}
              {mixedCount === 1 ? 'has' : 'have'} mixed status, and {fullyInCount}{' '}
              {fullyInCount === 1 ? 'is' : 'are'} fully opted in. Below is the confirmed
              per-jurisdiction status, plus what each scenario means for your bill.
            </p>
          </div>
        </div>

        <div className="container-content py-8">
          {/* Per-jurisdiction status grid */}
          <section className="mb-10 scroll-mt-24" aria-labelledby="lookup-heading">
            <h2 id="lookup-heading" className="text-2xl font-semibold text-text mb-2">
              Per-jurisdiction status (confirmed)
            </h2>
            <p className="text-sm text-text-muted mb-3 measure">
              Each county lists every relevant taxing unit — the county government (BOC), the
              county-wide school district, each incorporated city, and any independent school
              district. Status is confirmed from Board of Tax Assessors public records, county
              commission minutes, school board votes, and city council resolutions for tax year
              2025.
            </p>
            <p className="text-xs text-text-muted mb-4 measure flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-50 h-4 w-4 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200"
                >
                  ✓
                </span>
                <span><strong className="text-text font-semibold">In</strong> = stayed in HB 581, cap applies</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center rounded-full bg-amber-50 h-4 w-4 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200"
                >
                  ✕
                </span>
                <span><strong className="text-text font-semibold">Out</strong> = opted out, traditional math</span>
              </span>
            </p>
            <div className="space-y-3">
              {statuses.map(status => {
                const jurisdictionCount = status.jurisdictions.length
                return (
                  <details
                    key={status.countySlug}
                    className="group rounded-xl border border-border bg-surface overflow-hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 hover:bg-bg/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                      <div className="flex flex-col min-w-0">
                        <span className="text-lg font-semibold text-text">
                          {status.countyName} County
                        </span>
                        <span className="text-xs text-text-muted mt-0.5">
                          {jurisdictionCount} {jurisdictionCount === 1 ? 'jurisdiction' : 'jurisdictions'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 whitespace-nowrap ${statusBadgeClasses(status.overallStatus)}`}
                        >
                          {statusBadgeLabel(status.overallStatus)}
                        </span>
                        <span
                          className="text-text-muted transition-transform duration-200 group-open:rotate-180"
                          aria-hidden
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </div>
                    </summary>
                    <div className="border-t border-border">
                      <dl className="divide-y divide-border">
                        {status.jurisdictions.map((j, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-2 px-5 py-3"
                          >
                            <dt>
                              <span className="text-sm font-medium text-text">{j.label}</span>
                              {j.sublabel && (
                                <span className="block text-xs text-text-muted mt-0.5">
                                  {j.sublabel}
                                </span>
                              )}
                            </dt>
                            <dd className="sm:text-right">
                              {j.optedIn === null ? (
                                <span
                                  className="inline-flex items-center justify-center rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text-muted ring-1 ring-border"
                                  title="Opt-out status not yet recorded for this jurisdiction"
                                >
                                  —
                                </span>
                              ) : j.optedIn ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
                                  title="Stayed in HB 581 — floating homestead cap applies to this portion of the bill"
                                >
                                  <span aria-hidden="true">✓</span> In
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                                  title="Opted out of HB 581 — traditional math (40% × FMV − $2,000 homestead) applies"
                                >
                                  <span aria-hidden="true">✕</span> Out
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="border-t border-border bg-bg/30 px-5 py-3">
                        <Link
                          href={`/georgia/${status.countySlug}`}
                          className="text-sm font-medium text-primary hover:text-primary-hover"
                        >
                          View {status.countyName} County calculator →
                        </Link>
                      </div>
                    </div>
                  </details>
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
                opted-in jurisdictions, year-over-year growth in taxable value is capped at the
                Inflation Index Rate published annually by the State Revenue Commissioner. The
                2025 rate was 0%; the 2026 rate is 2.7% (December 2025 CPI-U). The cap resets
                when the property changes hands.
              </p>
              <p>
                <strong className="text-text">Opting out cancels the cap</strong> — but only
                for the jurisdiction that opted out. In a mixed county where, say, the school
                district opted out but the county and city stayed in, your annual bill has
                two different math paths: the school portion uses traditional 40% × FMV minus
                $2,000 homestead, while the county and city portions use the HB 581 capped
                taxable value. The $2,000 statewide homestead exemption still applies on all
                portions, and so do any local senior, veteran, or disability exemptions you
                already qualify for.
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
                growth and revenue growth. The Tax Foundation found that 68% of public
                school districts statewide opted out — a higher rate than counties (30%) or
                cities (26%) — reflecting this pressure.
              </p>
            </div>
          </section>

          <Divider />

          {/* Effect on bills */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="impact-heading">
            <h2 id="impact-heading" className="text-2xl font-semibold text-text mb-4">
              Effect on tax bills
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                Where a jurisdiction opted out, that portion of your taxable value continues
                to rise with market appreciation — the CPI cap does not apply. Other
                protections from before HB 581 remain in place: the $2,000 statewide
                homestead exemption on primary residences, plus any local senior age-65,
                veteran, disability, or pre-existing floating homesteads that homeowners
                already qualified for. Cobb and DeKalb offer large senior exemptions; Fulton
                stacks additional homestead amounts inside the City of Atlanta; Douglas
                exempts qualifying age-62 seniors from the school millage entirely
                (conditions apply). None of those mechanisms were modified by the opt-out.
              </p>
              <p>
                Where a jurisdiction stayed in HB 581, the cap binds based on when the
                homeowner acquired homestead status. Owners who had homestead status in
                2024 use the 2024 assessed value as their base year; the cap then applies
                CPI growth annually from there. Owners who buy in 2025 use their 2025
                assessed value as the base year, so the cap effectively doesn&apos;t bind in
                year one — the protection accrues in subsequent years.
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
                Opt-out decisions can be revisited annually through tax year 2029. They are
                adopted through public hearings (typically November or December for the
                following tax year) and published in three places:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  County Board of Tax Assessors sites — opt-out resolutions are posted when
                  adopted. Each Atlanta-area county maintains a searchable resolution archive.
                </li>
                <li>
                  County commission, school board, and city council meeting minutes from
                  late prior year, which include the public hearing record for opt-out
                  resolutions.
                </li>
                <li>
                  Local news coverage from the Atlanta Journal-Constitution, Georgia Public
                  Broadcasting, and county-level outlets.
                </li>
              </ul>
              <p>
                When a jurisdiction reverses an opt-out, the floating homestead applies going
                forward, but the cap resets to that year&apos;s assessed value as the new
                base year — it does not back-date to earlier values.
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
                Georgia Department of Revenue — Property Tax Administration guidance, including
                the annual Inflation Index Rate bulletin.{' '}
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
                Tax Foundation — Localities Opt Out of Georgia&apos;s New Homestead Tax
                Exemption (April 2025). Statewide totals and category breakdowns sourced from
                Georgia Secretary of State filings.{' '}
                <a
                  href="https://taxfoundation.org/blog/georgia-property-tax-reform/"
                  className="data-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  taxfoundation.org
                </a>
                .
              </li>
              <li>
                County Board of Tax Assessors public records and city / school board
                resolutions adopted Nov 2024 – Feb 2025 for the counties listed above.
              </li>
              <li>
                U.S. Census Bureau ACS 5-year estimates — median home values and median real
                estate taxes paid, used for the worked examples and effective-rate references.
              </li>
            </ul>
            <p className="text-xs text-text-muted mt-6 italic">
              This page provides editorial context and planning estimates only. Opt-out status
              and tax mechanics can change year to year. For the official position for any
              specific year, contact your county Board of Tax Assessors directly.
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
