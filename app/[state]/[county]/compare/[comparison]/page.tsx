import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStateData, getTownBySlugs } from '@/lib/geo'
import { isValidState } from '@/utils/stateUtils'
import { getTownDisplayName } from '@/utils/locationUtils'
import {
  getTownSlug,
  isTownReady,
  getCountyShortSlug,
  buildTownHref,
  buildComparisonHref,
} from '@/lib/links/towns'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { AppealPromptCard } from '@/components/town/AppealPromptCard'
import type { TownData, CountyData } from '@/lib/data/types'

// ─── URL helpers ─────────────────────────────────────────────────────────────

function parseComparison(comparison: string): [string, string] | null {
  const idx = comparison.indexOf('-vs-')
  if (idx === -1) return null
  const a = comparison.slice(0, idx)
  const b = comparison.slice(idx + 4)
  if (!a || !b) return null
  return [a, b]
}

function canonicalComparisonSlug(slugA: string, slugB: string): string {
  return [slugA, slugB].sort().join('-vs-')
}

function buildComparisonPath(
  state: string,
  countyShortSlug: string,
  slugA: string,
  slugB: string
): string {
  return `/${state}/${countyShortSlug}/compare/${canonicalComparisonSlug(slugA, slugB)}`
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const { getStateData } = await import('@/lib/geo')
  const states = ['new-jersey', 'texas']
  const params: { state: string; county: string; comparison: string }[] = []

  for (const stateSlug of states) {
    const stateData = getStateData(stateSlug)
    if (!stateData) continue

    for (const county of stateData.counties ?? []) {
      const shortSlug = getCountyShortSlug(county)
      const readyTowns = (county.towns ?? []).filter(t => getTownSlug(t) && isTownReady(t))

      for (let i = 0; i < readyTowns.length; i++) {
        for (let j = i + 1; j < readyTowns.length; j++) {
          const [sortedA, sortedB] = [
            getTownSlug(readyTowns[i]),
            getTownSlug(readyTowns[j]),
          ].sort()
          params.push({
            state: stateSlug,
            county: shortSlug,
            comparison: `${sortedA}-vs-${sortedB}`,
          })
        }
      }
    }
  }

  return params
}

// ─── Data extraction ──────────────────────────────────────────────────────────

export interface TownStats {
  town: TownData
  displayName: string
  slug: string
  effectiveRatePct: number | null
  effectiveRateYear: number | null
  avgBill: number | null
  avgBillYear: number | null
  medianHomeValue: number | null
  medianHomeValueYear: number | null
}

function extractStats(town: TownData, county: CountyData): TownStats {
  const rate = getMetricLatest({ town, county, metricKey: 'effectiveTaxRate' })
  const bill = getMetricLatest({ town, county, metricKey: 'averageResidentialTaxBill' })
  const homeVal = getMetricLatest({ town, county, metricKey: 'medianHomeValue' })

  return {
    town,
    displayName: getTownDisplayName(town),
    slug: getTownSlug(town),
    effectiveRatePct: rate?.value ?? null,
    effectiveRateYear: rate?.year ?? null,
    avgBill: bill?.value ?? null,
    avgBillYear: bill?.year ?? null,
    medianHomeValue: homeVal?.value ?? null,
    medianHomeValueYear: homeVal?.year ?? null,
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtRate(n: number): string {
  return `${n.toFixed(3)}%`
}

// ─── Dynamic SEO helpers ──────────────────────────────────────────────────────

/**
 * Build a meta title that includes actual rate data when available.
 * Falls back gracefully when one or both towns lack rate data.
 */
function buildComparisonTitle(
  statsA: TownStats,
  statsB: TownStats,
  countyName: string,
  stateAbbrev: string
): string {
  const base = `${statsA.displayName} vs ${statsB.displayName} Property Tax`
  const location = `${countyName} County, ${stateAbbrev}`

  if (statsA.effectiveRatePct != null && statsB.effectiveRatePct != null) {
    return `${base}: ${fmtRate(statsA.effectiveRatePct)} vs ${fmtRate(statsB.effectiveRatePct)} | ${location}`
  }
  if (statsA.avgBill != null && statsB.avgBill != null) {
    return `${base}: ${fmt(statsA.avgBill)} vs ${fmt(statsB.avgBill)} avg bill | ${location}`
  }
  return `${base} Comparison | ${location}`
}

/**
 * Build a meta description that leads with the key finding.
 */
function buildComparisonDescription(
  statsA: TownStats,
  statsB: TownStats,
  countyName: string,
  stateName: string,
  year: number | null
): string {
  const yearSuffix = year ? ` (${year} data)` : ''

  if (statsA.effectiveRatePct != null && statsB.effectiveRatePct != null) {
    const lower = statsA.effectiveRatePct <= statsB.effectiveRatePct ? statsA : statsB
    const higher = lower === statsA ? statsB : statsA
    const diff = Math.abs(statsA.effectiveRatePct - statsB.effectiveRatePct)
    return `${lower.displayName} has a lower effective property tax rate (${fmtRate(lower.effectiveRatePct!)}) than ${higher.displayName} (${fmtRate(higher.effectiveRatePct!)}), a difference of ${diff.toFixed(3)} points. Side-by-side comparison for ${countyName} County, ${stateName}${yearSuffix}.`
  }
  return `Side-by-side property tax comparison for ${statsA.displayName} and ${statsB.displayName} in ${countyName} County, ${stateName}${yearSuffix}. Effective rates, average bills, and median home values.`
}

/**
 * Build a dynamic opening paragraph for the page body.
 * Data-driven: uses whatever metrics are available, skips what isn't.
 */
function buildIntroParagraph(
  statsA: TownStats,
  statsB: TownStats,
  countyName: string,
  stateName: string,
  year: number | null
): string {
  const parts: string[] = []

  parts.push(
    `${statsA.displayName} and ${statsB.displayName} are both municipalities in ${countyName} County, ${stateName}.`
  )

  if (statsA.effectiveRatePct != null && statsB.effectiveRatePct != null) {
    const lower = statsA.effectiveRatePct <= statsB.effectiveRatePct ? statsA : statsB
    const higher = lower === statsA ? statsB : statsA
    const diff = Math.abs(statsA.effectiveRatePct - statsB.effectiveRatePct).toFixed(3)
    parts.push(
      `Based on the most recent available data${year ? ` (${year})` : ''}, ${lower.displayName} carries a lower effective property tax rate of ${fmtRate(lower.effectiveRatePct!)} compared to ${higher.displayName} at ${fmtRate(higher.effectiveRatePct!)}, a difference of ${diff} percentage points.`
    )
  }

  if (statsA.avgBill != null && statsB.avgBill != null) {
    const lower = statsA.avgBill <= statsB.avgBill ? statsA : statsB
    const higher = lower === statsA ? statsB : statsA
    const diff = Math.abs(statsA.avgBill - statsB.avgBill)
    parts.push(
      `The average residential property tax bill is ${fmt(diff)} lower in ${lower.displayName} (${fmt(lower.avgBill!)}) than in ${higher.displayName} (${fmt(higher.avgBill!)}).`
    )
  }

  parts.push(
    `The table below shows the full side-by-side breakdown of effective rates, average bills, and median home values.`
  )

  return parts.join(' ')
}

/**
 * Generate FAQ items dynamically from available data.
 * All questions are answerable from data alone — no hardcoded state facts.
 */
function buildComparisonFaqs(
  statsA: TownStats,
  statsB: TownStats,
  countyName: string,
  stateName: string
): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = []

  // Primary comparison question — always first
  if (statsA.effectiveRatePct != null && statsB.effectiveRatePct != null) {
    const lower = statsA.effectiveRatePct <= statsB.effectiveRatePct ? statsA : statsB
    const higher = lower === statsA ? statsB : statsA
    const diff = Math.abs(statsA.effectiveRatePct - statsB.effectiveRatePct).toFixed(3)
    faqs.push({
      question: `Which has lower property taxes, ${statsA.displayName} or ${statsB.displayName}?`,
      answer: `${lower.displayName} has a lower effective property tax rate (${fmtRate(lower.effectiveRatePct!)}) compared to ${higher.displayName} (${fmtRate(higher.effectiveRatePct!)}), a difference of ${diff} percentage points${lower.effectiveRateYear ? ` as of ${lower.effectiveRateYear}` : ''}.`,
    })
  } else {
    faqs.push({
      question: `Which has lower property taxes, ${statsA.displayName} or ${statsB.displayName}?`,
      answer: `Detailed rate data is not yet available for one or both towns. The comparison table on this page shows all available figures. For official tax rates, contact the ${countyName} County tax assessor's office.`,
    })
  }

  // Per-town rate questions
  for (const s of [statsA, statsB]) {
    if (s.effectiveRatePct != null) {
      faqs.push({
        question: `What is the property tax rate in ${s.displayName}?`,
        answer: `The effective property tax rate in ${s.displayName} is ${fmtRate(s.effectiveRatePct)}${s.effectiveRateYear ? ` (${s.effectiveRateYear})` : ''}. The effective rate is the ratio of the average tax bill to the median home value — it accounts for assessments, exemptions, and all overlapping taxing jurisdictions.`,
      })
    }
  }

  // Per-town bill questions
  for (const s of [statsA, statsB]) {
    if (s.avgBill != null) {
      faqs.push({
        question: `What is the average property tax bill in ${s.displayName}?`,
        answer: `The average residential property tax bill in ${s.displayName} is ${fmt(s.avgBill)}${s.avgBillYear ? ` (${s.avgBillYear})` : ''}. Individual bills vary based on your home's assessed value, any exemptions you qualify for, and the rates set by your specific taxing units.`,
      })
    }
  }

  // Bill difference question
  if (statsA.avgBill != null && statsB.avgBill != null) {
    const diff = Math.abs(statsA.avgBill - statsB.avgBill)
    const lower = statsA.avgBill <= statsB.avgBill ? statsA : statsB
    const higher = lower === statsA ? statsB : statsA
    faqs.push({
      question: `How much higher is the average property tax bill in ${higher.displayName} than ${lower.displayName}?`,
      answer: `The average residential tax bill in ${higher.displayName} (${fmt(higher.avgBill!)}) is approximately ${fmt(diff)} higher than in ${lower.displayName} (${fmt(lower.avgBill!)}). This difference reflects a combination of higher assessed values and a higher effective rate.`,
    })
  }

  // Home value question
  if (statsA.medianHomeValue != null && statsB.medianHomeValue != null) {
    const higher =
      statsA.medianHomeValue >= statsB.medianHomeValue ? statsA : statsB
    const lower = higher === statsA ? statsB : statsA
    faqs.push({
      question: `How do home values compare between ${statsA.displayName} and ${statsB.displayName}?`,
      answer: `Median home values are higher in ${higher.displayName} (${fmt(higher.medianHomeValue!)}${higher.medianHomeValueYear ? `, ${higher.medianHomeValueYear}` : ''}) than in ${lower.displayName} (${fmt(lower.medianHomeValue!)}${lower.medianHomeValueYear ? `, ${lower.medianHomeValueYear}` : ''}). A higher home value raises the absolute tax bill even when effective rates are similar.`,
    })
  }

  // Appeal question — always included
  faqs.push({
    question: `Can I appeal my property tax assessment in ${countyName} County?`,
    answer: `Yes. Property owners in ${countyName} County, ${stateName} can appeal their assessment through the county board of taxation if they believe their assessed value is higher than the property's current market value. A successful appeal can reduce your assessed value and lower your annual tax bill. Deadlines and procedures vary — contact the ${countyName} County tax assessor's office for current filing dates.`,
  })

  // Data sourcing question — always last
  faqs.push({
    question: `Where does the property tax data for ${statsA.displayName} and ${statsB.displayName} come from?`,
    answer: `Data on this page is sourced from publicly available government records including state tax authority publications and the U.S. Census Bureau American Community Survey. Effective rates and average bills may reflect county-level data where municipality-level figures are not published. All figures are for planning and comparison only — verify current rates with your local assessor.`,
  })

  return faqs
}

// ─── Page types ───────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ state: string; county: string; comparison: string }>
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam, county: countyParam, comparison } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) return { title: 'Not Found | Property Tax Calculator' }

  const parsed = parseComparison(comparison)
  if (!parsed) return { title: 'Not Found | Property Tax Calculator' }
  const [slugA, slugB] = parsed

  const resultA = getTownBySlugs(state, countyParam, slugA)
  const resultB = getTownBySlugs(state, countyParam, slugB)
  if (!resultA || !resultB) return { title: 'Not Found | Property Tax Calculator' }

  const stateData = getStateData(state)!
  const { county } = resultA
  const statsA = extractStats(resultA.town, county)
  const statsB = extractStats(resultB.town, county)

  const year =
    statsA.effectiveRateYear ?? statsB.effectiveRateYear ?? stateData.state.asOfYear ?? null

  const title = buildComparisonTitle(statsA, statsB, county.name, stateData.state.abbreviation)
  const description = buildComparisonDescription(
    statsA,
    statsB,
    county.name,
    stateData.state.name,
    year
  )
  const path = `/${encodeURIComponent(state)}/${encodeURIComponent(countyParam)}/compare/${comparison}`

  return buildMetadata({
    title,
    absoluteTitle: true,
    description,
    path,
    keywords: `${statsA.displayName} vs ${statsB.displayName} property tax, ${statsA.displayName} ${statsB.displayName} tax comparison, ${county.name} County property tax rates, ${stateData.state.name} property tax comparison`,
    openGraph: { title, description, type: 'website' },
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ComparisonPage({ params }: Props) {
  const { state: stateParam, county: countyParam, comparison } = await params
  const state = decodeURIComponent(stateParam)

  if (!isValidState(state)) notFound()

  const parsed = parseComparison(comparison)
  if (!parsed) notFound()
  const [slugA, slugB] = parsed

  const resultA = getTownBySlugs(state, countyParam, slugA)
  const resultB = getTownBySlugs(state, countyParam, slugB)
  if (!resultA || !resultB) notFound()

  const { county } = resultA
  const countyShortSlug = getCountyShortSlug(county)

  // Canonical redirect
  const canonical = canonicalComparisonSlug(slugA, slugB)
  if (comparison !== canonical) {
    permanentRedirect(buildComparisonPath(state, countyShortSlug, slugA, slugB))
  }

  const stateData = getStateData(state)!
  const stateName = stateData.state.name
  const abbrev = stateData.state.abbreviation

  const statsA = extractStats(resultA.town, county)
  const statsB = extractStats(resultB.town, county)

  const year =
    statsA.effectiveRateYear ?? statsB.effectiveRateYear ?? stateData.state.asOfYear ?? null

  const countyPageUrl = `${SITE_URL}/${state}/${countyShortSlug}-county-property-tax`
  const pageUrl = `${SITE_URL}/${state}/${countyShortSlug}/compare/${canonical}`

  const faqs = buildComparisonFaqs(statsA, statsB, county.name, stateName)
  const introParagraph = buildIntroParagraph(statsA, statsB, county.name, stateName, year)

  const higherRateTown =
    statsA.effectiveRatePct != null &&
    statsB.effectiveRatePct != null &&
    statsA.effectiveRatePct > statsB.effectiveRatePct
      ? statsA
      : statsB

  // Related comparisons: up to 5 other ready towns in the same county
  const otherTowns = (county.towns ?? [])
    .filter(t => {
      const s = getTownSlug(t)
      return isTownReady(t) && s !== slugA && s !== slugB
    })
    .slice(0, 5)

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: `${SITE_URL}/${state}` },
          { name: `${county.name} County`, url: countyPageUrl },
          { name: `${statsA.displayName} vs ${statsB.displayName}`, url: pageUrl },
        ])}
      />
      <JsonLd data={faqJsonLd(pageUrl, faqs)} />

      <Header />
      <main className="min-h-screen bg-gradient-to-br from-bg-gradient-from to-bg-gradient-to">
        <div className="container-page py-8">

          {/* Breadcrumb */}
          <nav className="text-sm text-text-muted mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">→</span>
            <Link href={`/${state}`} className="hover:text-primary">{stateName}</Link>
            <span className="mx-2">→</span>
            <Link href={countyPageUrl} className="hover:text-primary">{county.name} County</Link>
            <span className="mx-2">→</span>
            <span className="text-text">{statsA.displayName} vs {statsB.displayName}</span>
          </nav>

          {/* H1 + intro */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-3">
              {statsA.displayName} vs {statsB.displayName}: Property Tax Comparison
            </h1>
            <p className="text-sm text-text-muted mb-1">
              {county.name} County, {stateName}{year ? ` — ${year} data` : ''}
            </p>
            <p className="text-base text-text-muted max-w-prose leading-relaxed mt-3">
              {introParagraph}
            </p>
          </div>

          {/* Side-by-side stats table */}
          <section className="mb-10" aria-labelledby="comparison-heading">
            <h2 id="comparison-heading" className="text-xl font-semibold text-text mb-4">
              Side-by-side comparison
            </h2>

            <div className="grid grid-cols-3 gap-2 mb-2 px-3">
              <div />
              <div className="text-center font-semibold text-text text-sm">{statsA.displayName}</div>
              <div className="text-center font-semibold text-text text-sm">{statsB.displayName}</div>
            </div>

            <ComparisonRow
              label="Effective tax rate"
              valA={statsA.effectiveRatePct}
              valB={statsB.effectiveRatePct}
              yearA={statsA.effectiveRateYear}
              yearB={statsB.effectiveRateYear}
              format="rate"
              lowerIsBetter
            />
            <ComparisonRow
              label="Avg residential tax bill"
              valA={statsA.avgBill}
              valB={statsB.avgBill}
              yearA={statsA.avgBillYear}
              yearB={statsB.avgBillYear}
              format="usd"
              lowerIsBetter
            />
            <ComparisonRow
              label="Median home value"
              valA={statsA.medianHomeValue}
              valB={statsB.medianHomeValue}
              yearA={statsA.medianHomeValueYear}
              yearB={statsB.medianHomeValueYear}
              format="usd"
              lowerIsBetter={false}
            />
          </section>

          {/* Appeal prompt */}
          {(statsA.effectiveRatePct != null || statsB.effectiveRatePct != null) && (
            <AppealPromptCard stateSlug={state} townDisplayName={higherRateTown.displayName} />
          )}

          {/* Full town page links */}
          <section className="mb-10" aria-labelledby="full-pages-heading">
            <h2 id="full-pages-heading" className="text-xl font-semibold text-text mb-3">
              Full town profiles
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[statsA, statsB].map(s => (
                <Link
                  key={s.slug}
                  href={buildTownHref(state, countyShortSlug, s.slug)}
                  className="rounded-lg border border-border bg-surface p-4 hover:border-primary transition-colors block"
                >
                  <p className="font-medium text-text">{s.displayName}</p>
                  <p className="text-sm text-text-muted mt-1">
                    {s.effectiveRatePct != null && (
                      <span className="mr-2">Rate: {fmtRate(s.effectiveRatePct)}</span>
                    )}
                    View rates, trends &amp; calculator →
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-semibold text-text mb-4">
              {statsA.displayName} vs {statsB.displayName} — frequently asked questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <h3 className="font-semibold text-text mb-2 text-sm">{faq.question}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Related comparisons */}
          {otherTowns.length > 0 && (
            <section className="mb-10" aria-labelledby="related-comparisons-heading">
              <h2
                id="related-comparisons-heading"
                className="text-xl font-semibold text-text mb-3"
              >
                Compare other {county.name} County towns
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {[statsA, statsB].flatMap(base =>
                  otherTowns.map(t => {
                    const otherSlug = getTownSlug(t)
                    const href = buildComparisonHref(state, countyShortSlug, base.slug, otherSlug)
                    return (
                      <Link
                        key={`${base.slug}-${otherSlug}`}
                        href={href}
                        className="text-sm data-link"
                      >
                        {base.displayName} vs {getTownDisplayName(t)}
                      </Link>
                    )
                  })
                )}
              </div>
            </section>
          )}

          {/* Sources */}
          <section className="mb-10 border-t border-border pt-6">
            <p className="text-sm text-text-muted">
              Data sourced from state tax authority publications and the U.S. Census Bureau
              American Community Survey. Figures are for planning and comparison only — actual
              bills depend on official assessments, exemptions, and local levy decisions.{' '}
              <Link href="/methodology" className="data-link">
                Methodology
              </Link>
              .
            </p>
          </section>

          <div className="text-sm">
            <Link href={countyPageUrl} className="data-link">
              ← All {county.name} County towns
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ComparisonRow({
  label,
  valA,
  valB,
  yearA,
  yearB,
  format,
  lowerIsBetter,
}: {
  label: string
  valA: number | null
  valB: number | null
  yearA: number | null
  yearB: number | null
  format: 'usd' | 'rate'
  lowerIsBetter: boolean
}) {
  const formatVal = (v: number) => (format === 'rate' ? fmtRate(v) : fmt(v))

  const winnerA =
    valA != null && valB != null ? (lowerIsBetter ? valA < valB : valA > valB) : false
  const winnerB =
    valA != null && valB != null ? (lowerIsBetter ? valB < valA : valB > valA) : false

  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface p-3 mb-2 items-center">
      <div className="text-sm text-text-muted">{label}</div>

      <div className="text-center">
        {valA != null ? (
          <>
            <span
              className={`font-semibold text-sm ${winnerA ? 'text-green-700 dark:text-green-400' : 'text-text'}`}
            >
              {formatVal(valA)}
              {winnerA && (
                <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                  lower
                </span>
              )}
            </span>
            {yearA && <div className="text-xs text-text-muted">{yearA}</div>}
          </>
        ) : (
          <span className="text-sm text-text-muted">—</span>
        )}
      </div>

      <div className="text-center">
        {valB != null ? (
          <>
            <span
              className={`font-semibold text-sm ${winnerB ? 'text-green-700 dark:text-green-400' : 'text-text'}`}
            >
              {formatVal(valB)}
              {winnerB && (
                <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                  lower
                </span>
              )}
            </span>
            {yearB && <div className="text-xs text-text-muted">{yearB}</div>}
          </>
        ) : (
          <span className="text-sm text-text-muted">—</span>
        )}
      </div>
    </div>
  )
}
