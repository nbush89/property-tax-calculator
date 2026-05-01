import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, faqJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'
import { getStateData } from '@/lib/geo'
import { isValidState } from '@/utils/stateUtils'
import { getAllCountyRatesFromState, getMaxEffectiveTaxRateYearInState } from '@/lib/rates-from-state'
import { getStateAffiliateConfig } from '@/lib/affiliates/affiliateConfig'
import { getAppealContent } from '@/lib/appeal/appealContent'
import AppealCalculator from '@/components/appeal/AppealCalculator'

type Props = {
  params: Promise<{ state: string }>
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return ['new-jersey', 'texas'].map(state => ({ state }))
}

// ─── Dynamic FAQ builder ──────────────────────────────────────────────────────

function buildAppealFaqs(
  stateName: string,
  stateAbbrev: string,
  appealBoard: string,
  deadlineGuidance: string,
  requiredDocs: string[],
  tips: string[]
): { question: string; answer: string }[] {
  return [
    {
      question: `What is a property tax appeal in ${stateName}?`,
      answer: `A property tax appeal is a formal request to have your property's assessed value reviewed and potentially lowered. In ${stateName}, assessments are used to calculate your annual property tax bill — if your assessed value is higher than your home's actual market value, you may be paying more than you should. Filing an appeal with the ${appealBoard} allows you to challenge the assessment using comparable sales and other evidence.`,
    },
    {
      question: `How do I know if I'm over-assessed in ${stateName}?`,
      answer: `Compare your assessed value (shown on your tax bill or assessment notice) to recent sale prices of similar homes in your neighborhood. If your assessed value is materially higher than what comparable homes have sold for, you may be over-assessed. The calculator above estimates your potential overpayment using your county's current effective tax rate.`,
    },
    {
      question: `How much can I save by appealing my property taxes in ${stateAbbrev}?`,
      answer: `Savings depend on the size of the over-assessment and your county's tax rate. For example, if your property is assessed $50,000 above market value and your county's effective rate is 2%, a successful appeal could save approximately $1,000 per year. Use the calculator above to estimate your specific situation. Savings persist year over year as long as the lower assessment holds.`,
    },
    {
      question: `What is the deadline to appeal property taxes in ${stateName}?`,
      answer: deadlineGuidance,
    },
    {
      question: `What documents do I need to appeal my property taxes in ${stateName}?`,
      answer: `The most important evidence is comparable recent sales (comps) of similar properties in your neighborhood. You will also need: ${requiredDocs.join('; ')}. The stronger your comparables, the better your chances of a successful appeal.`,
    },
    {
      question: `Who hears property tax appeals in ${stateName}?`,
      answer: `In ${stateName}, assessment appeals are heard by the ${appealBoard}. You can represent yourself or hire a property tax attorney or a third-party appeal service. If you disagree with the board's decision, further appeal to the state tax court is typically available.`,
    },
    {
      question: `What happens after a successful property tax appeal in ${stateName}?`,
      answer: `If your appeal succeeds, your assessed value is reduced to the approved amount. Your annual tax bill is then recalculated using the new lower assessed value and the applicable tax rate. The reduction generally applies to the tax year in which you filed; future years are not automatically adjusted, but the lower assessment often carries forward unless the assessor revalues your property.`,
    },
    {
      question: `Can I use a service to appeal my property taxes instead of doing it myself?`,
      answer: `Yes. Third-party appeal services like Ownwell handle the research, paperwork, and hearing on your behalf. They typically charge a percentage of the first year's savings — if they don't save you money, you pay nothing. This can be a practical option if you don't have time to pull comparables and prepare a case yourself.`,
    },
  ]
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  if (!isValidState(state)) return { title: 'Not Found | Property Tax Calculator' }

  const stateData = getStateData(state)
  if (!stateData) return { title: 'Not Found | Property Tax Calculator' }

  const { name: stateName, abbreviation: abbrev } = stateData.state
  const dataYear = getMaxEffectiveTaxRateYearInState(stateData) ?? stateData.state.asOfYear
  const yearSuffix = dataYear ? ` (${dataYear})` : ''
  const path = `/${encodeURIComponent(state)}/property-tax-appeal-calculator`

  const title = `${abbrev} Property Tax Appeal Calculator${yearSuffix} — Am I Over-Assessed?`
  const description = `Find out if your ${stateName} property is over-assessed and estimate how much you could save with a tax appeal. Enter your county, assessed value, and estimated market value to get an instant savings estimate.`

  return buildMetadata({
    title,
    absoluteTitle: true,
    description,
    path,
    keywords: `${stateName} property tax appeal calculator, am I over-assessed ${abbrev}, how to appeal property taxes ${stateName}, property tax appeal savings estimator, ${abbrev} property tax appeal, over-assessed ${stateName} property`,
    openGraph: { title, description, type: 'website' },
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AppealCalculatorPage({ params }: Props) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)

  if (!isValidState(state)) notFound()

  const stateData = getStateData(state)
  if (!stateData) notFound()

  const { name: stateName, abbreviation: abbrev } = stateData.state
  const countyRates = getAllCountyRatesFromState(stateData)
  const { appealCta } = getStateAffiliateConfig(state)
  const appeal = getAppealContent(state)

  const pageUrl = `${SITE_URL}/${encodeURIComponent(state)}/property-tax-appeal-calculator`
  const stateUrl = `${SITE_URL}/${encodeURIComponent(state)}`

  const faqs = buildAppealFaqs(
    stateName,
    abbrev,
    appeal.appealBoard,
    appeal.deadlineGuidance,
    appeal.requiredDocs,
    appeal.tips
  )

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: stateName, url: stateUrl },
          { name: 'Property Tax Appeal Calculator', url: pageUrl },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description: `Estimate your ${stateName} property tax over-assessment and potential appeal savings.`,
        })}
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
            <span className="text-text">Property Tax Appeal Calculator</span>
          </nav>

          {/* H1 + intro */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-3">
              {stateName} Property Tax Appeal Calculator
            </h1>
            <p className="text-base text-text-muted max-w-prose leading-relaxed">
              If your property's assessed value is higher than its current market value, you may
              be overpaying property taxes. Enter your county, assessed value, and an estimated
              market value below to see how much a successful appeal could save you each year.
            </p>
          </div>

          {/* Calculator */}
          <section className="mb-10 rounded-lg border border-border bg-surface p-6" aria-labelledby="calculator-heading">
            <h2 id="calculator-heading" className="text-xl font-semibold text-text mb-4">
              Estimate your over-assessment
            </h2>
            <AppealCalculator
              countyRates={countyRates}
              stateName={stateName}
              stateAbbrev={abbrev}
              appealCta={appealCta}
            />
          </section>

          {/* How the appeal process works */}
          <section className="mb-10" aria-labelledby="process-heading">
            <h2 id="process-heading" className="text-2xl font-semibold text-text mb-4">
              How property tax appeals work in {stateName}
            </h2>
            <p className="text-text-muted mb-4 max-w-prose leading-relaxed">
              {appeal.processOverview}
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-text mb-2 text-sm">Filing deadline</h3>
                <p className="text-sm text-text-muted">{appeal.deadlineGuidance}</p>
              </div>
              <div>
                <h3 className="font-semibold text-text mb-2 text-sm">Documents typically needed</h3>
                <ul className="text-sm text-text-muted space-y-1 list-disc pl-4">
                  {appeal.requiredDocs.map((doc, i) => (
                    <li key={i}>{doc}</li>
                  ))}
                </ul>
              </div>
            </div>
            {appeal.tips.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-text mb-2 text-sm">Tips for a stronger appeal</h3>
                <ul className="text-sm text-text-muted space-y-2 list-disc pl-4">
                  {appeal.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 text-sm">
              <a
                href={appeal.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="data-link"
              >
                {appeal.officialUrlLabel} →
              </a>
            </p>
          </section>

          {/* FAQ */}
          <section className="mb-12" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-semibold text-text mb-4">
              {stateName} property tax appeal — frequently asked questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-5">
                  <h3 className="font-semibold text-text mb-2 text-sm">{faq.question}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Related links */}
          <section className="mb-10 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-text mb-3">Related tools</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${state}/property-tax-calculator`}
                className="text-sm data-link"
              >
                {abbrev} property tax calculator
              </Link>
              <Link
                href={`/${state}/property-tax-rates`}
                className="text-sm data-link"
              >
                {stateName} tax rates by county
              </Link>
              <Link
                href={`/${state}`}
                className="text-sm data-link"
              >
                {stateName} overview
              </Link>
            </div>
          </section>

          <section className="text-xs text-text-muted">
            <p>
              Estimates are for planning purposes only. Actual appeal outcomes and tax savings
              depend on comparable sales evidence, the board's decision, exemptions, and local
              levy rates. This is not legal or tax advice.{' '}
              <Link href="/methodology" className="data-link">
                Methodology
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
