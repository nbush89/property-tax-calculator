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
import { appendSid, getStateAffiliateConfig } from '@/lib/affiliates/affiliateConfig'

type Props = {
  params: Promise<{ state: string }>
}

// Only render this page for Texas. Other states get a 404. (Mirrors the GA
// HB 581 page's state gating — each state's exemption mechanics differ
// enough that a single shared page wouldn't be honest.)
export async function generateStaticParams() {
  return [{ state: 'texas' }]
}

/**
 * /texas/property-tax-exemptions
 *
 * Editorial reference for Texas residential property tax exemptions. High-
 * leverage because (1) the 2-year retroactive filing window is widely misunderstood
 * — most homeowners who forgot to file at purchase don't know they can recover
 * up to 2 years of overpayment under Tax Code §11.431, and (2) general / senior
 * / disabled / veteran exemption mechanics changed materially in 2023 and 2025
 * (Prop 4 raised the school M&O homestead exemption from $40K → $100K, then
 * legislative action raised it again to $140K effective 2025), and most
 * existing content online is stale.
 *
 * Targets search queries like:
 *   - texas homestead exemption amount 2026
 *   - texas property tax exemption over 65
 *   - texas retroactive homestead exemption
 *   - how to file texas property tax exemption
 *
 * Also serves as the natural home for Ownwell's exemptions CTA — they file
 * general + senior exemptions + 2-year retroactive recovery on the homeowner's
 * behalf.
 */

// ─── Exemption data ──────────────────────────────────────────────────────────

type ExemptionRow = {
  name: string
  shortDescription: string
  schoolDistrictAmount: string
  countyCityNote: string
  eligibility: string
}

const EXEMPTIONS: ExemptionRow[] = [
  {
    name: 'General residence homestead',
    shortDescription:
      "The baseline statewide exemption every primary-residence homeowner can claim. Reduces taxable value before the school M&O tax rate is applied.",
    schoolDistrictAmount: '$140,000',
    countyCityNote:
      'County and city taxing units may offer optional homestead exemptions on top of the statewide minimum, but amounts vary widely.',
    eligibility:
      'You must own the home and use it as your principal residence on January 1 of the tax year.',
  },
  {
    name: 'Age 65 or older (senior)',
    shortDescription:
      'Additional school district exemption on top of the general homestead, plus a school tax ceiling that freezes your school taxes at the qualifying year\'s amount.',
    schoolDistrictAmount: '+$60,000 ($200,000 total)',
    countyCityNote:
      "Many counties and cities offer additional senior exemptions and may also adopt local tax ceilings. Check your county appraisal district.",
    eligibility:
      'Age 65 or older with an ownership interest in the property as your principal residence. The school tax ceiling applies once you qualify and is portable to a new homestead within Texas.',
  },
  {
    name: 'Disabled person',
    shortDescription:
      'Same structure as the over-65 exemption — additional $60,000 school district exemption plus the school tax ceiling.',
    schoolDistrictAmount: '+$60,000 ($200,000 total)',
    countyCityNote:
      'Often pairs with local optional add-ons. You cannot stack the over-65 and disabled exemptions on the same school district — pick whichever is more favorable.',
    eligibility:
      "Must meet the Social Security Administration definition of disability under Title II or XVI. File Form 50-114 with documentation from SSA or your physician.",
  },
  {
    name: '100% disabled veteran',
    shortDescription:
      "Complete exemption from property tax on the veteran's residence homestead.",
    schoolDistrictAmount: '100% (no taxable value)',
    countyCityNote:
      'Applies across all taxing units, not just school districts. Partial disability ratings receive a graduated exemption ($5,000 – $12,000 depending on rating tier).',
    eligibility:
      "Service-connected 100% disability rating from the U.S. Department of Veterans Affairs, OR receipt of 100% disability compensation due to unemployability. Surviving spouses also qualify under specific conditions.",
  },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function buildFaqs(): { question: string; answer: string }[] {
  return [
    {
      question: 'What is the Texas property tax homestead exemption amount?',
      answer:
        "For 2026, the general residence homestead exemption is $140,000 off the school district maintenance & operations (M&O) taxable value. Homeowners 65 or older or disabled receive an additional $60,000 ($200,000 total school exemption) plus a school tax ceiling that freezes their school taxes at the qualifying year's amount. County and city taxing units may offer optional homestead exemptions on top of the statewide minimum, but those amounts vary by taxing unit.",
    },
    {
      question: 'Can I file a Texas homestead exemption retroactively if I forgot?',
      answer:
        "Yes. Under Texas Tax Code §11.431, you can file a late residence homestead exemption application up to 2 years past the delinquency date for the tax year you're claiming. Once approved, the chief appraiser notifies each affected taxing unit, and the tax collector either deducts the exempted tax (if unpaid) or refunds you the difference (if already paid). Many homeowners who forgot to file when they purchased are owed refunds and never claim them — the chief appraiser does not contact you proactively.",
    },
    {
      question: 'When is the Texas homestead exemption deadline?',
      answer:
        "The statewide general deadline is April 30 of the tax year. Filing later is still possible up to 2 years past the delinquency date (typically February 1 of the following year, plus the 2-year retroactive window). Most counties recommend filing immediately after closing — exemptions are not transferable from the prior owner, so a new buyer must apply themselves.",
    },
    {
      question: 'Does the over-65 exemption freeze my property taxes?',
      answer:
        "Only the school district portion of your taxes is frozen at the year you qualify. County, city, and special district portions can still increase year over year. The school tax ceiling is portable — if you sell and move to a new homestead within Texas, you can transfer the percentage relationship (not the dollar amount) to your new home. Once frozen, the ceiling can only decrease — it never goes back up unless you make substantial improvements.",
    },
    {
      question: 'How do Texas exemptions interact with the 10% homestead cap?',
      answer:
        "They're separate mechanisms. The homestead cap (Texas Tax Code §23.23) limits annual increases in your home's appraised value to 10% once you have a homestead exemption on file — protecting against rapid market appreciation. The exemptions described on this page reduce taxable value by a fixed dollar amount. Both apply simultaneously to a qualifying homestead: the cap limits the appraised value first, then the exemption is subtracted to produce taxable value.",
    },
    {
      question: 'How do I file a Texas homestead exemption?',
      answer:
        "File Form 50-114 (Residence Homestead Exemption Application) with the appraisal district for the county where the home is located. Most counties accept filings online, by mail, or in person — your county appraisal district website has the specific form and submission options. You'll need a copy of your Texas driver's license or ID showing the property address as your residence. Once approved, the exemption renews automatically each year as long as you continue to occupy the home as your principal residence.",
    },
    {
      question: 'Can I file Texas exemptions through a service like Ownwell?',
      answer:
        "Yes. Ownwell and similar property tax services file general homestead and senior (65+) exemptions on your behalf, and can pursue the 2-year retroactive filing window if you missed earlier years. They typically charge a percentage of the first year's savings — you pay nothing if no exemption is approved or no refund is recovered. This can be a practical option if you find the appraisal district paperwork confusing or if you're claiming retroactive recovery on multiple years.",
    },
    {
      question: 'What other Texas property tax exemptions exist?',
      answer:
        "Beyond the four core homestead-related exemptions covered here, Texas offers exemptions for surviving spouses of first responders killed in the line of duty, surviving spouses of military service members killed on active duty, properties used for charitable or religious purposes, agricultural and timber-use valuations (which are technically not exemptions but use-value assessment), and freeport exemptions for certain inventories. Each has its own eligibility rules — check the Texas Comptroller's exemptions page for the full list.",
    },
  ]
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params
  if (state !== 'texas') return { title: 'Not Found | Property Tax Calculator' }
  const path = '/texas/property-tax-exemptions'
  return buildMetadata({
    title:
      'Texas Property Tax Exemptions 2026: $140K Homestead, Senior 65+, & 2-Year Retroactive Filing',
    absoluteTitle: true,
    description:
      "Texas raised the school district homestead exemption to $140,000 in 2025; seniors 65+ get $200,000 total. If you forgot to file when you bought, you can recover up to 2 years of overpaid taxes retroactively under Tax Code §11.431. Full guide here.",
    path,
    keywords:
      'Texas homestead exemption 2026, Texas property tax exemption, over 65 Texas property tax, Texas retroactive homestead exemption, Texas Tax Code 11.431, $140K Texas homestead, Texas school tax ceiling, Texas disabled veteran exemption, how to file Texas homestead exemption',
    openGraph: {
      title: 'Texas Property Tax Exemptions — $140K Homestead, Senior Benefits, 2-Year Retroactive Recovery',
      description:
        "Full Texas residential property tax exemption guide for 2026, including the often-missed 2-year retroactive filing window that can refund overpaid taxes.",
      type: 'article',
    },
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TexasPropertyTaxExemptionsPage({ params }: Props) {
  const { state } = await params
  if (state !== 'texas') notFound()

  const pageUrl = `${SITE_URL}/texas/property-tax-exemptions`
  const faqs = buildFaqs()
  const affiliate = getStateAffiliateConfig('texas')
  const exemptionsCta = affiliate.exemptionsCta

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Texas', url: `${SITE_URL}/texas` },
          { name: 'Property tax exemptions', url: pageUrl },
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
              <Link href="/texas" className="hover:text-primary transition-colors">
                Texas
              </Link>
              <span className="mx-2">→</span>
              <span className="text-text">Property tax exemptions</span>
            </nav>
            <h1 className="text-3xl font-semibold tracking-tight text-text mb-3">
              Texas property tax exemptions — the 2026 guide
            </h1>
            <p className="text-base text-text-muted max-w-prose leading-relaxed">
              Texas raised the statewide general residence homestead exemption to $140,000 (school
              district M&amp;O) effective tax year 2025, up from $100,000 — and homeowners 65 or
              older or disabled receive an additional $60,000, bringing the total school exemption
              to $200,000. Less widely known: if you missed filing for homestead when you
              purchased your home, Texas Tax Code §11.431 lets you file <strong>up to 2 years
              after the delinquency date</strong> and recover the overpaid tax. Many homeowners are
              owed refunds and never claim them.
            </p>
          </div>
        </div>

        <div className="container-content py-8">
          {/* Lead with the 2-year retroactive — distinctive editorial angle */}
          <section className="mb-10 scroll-mt-24" aria-labelledby="retro-heading">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2
                id="retro-heading"
                className="text-lg font-semibold text-amber-900 mb-2"
              >
                If you forgot to file when you bought, you can still recover up to 2 years of
                overpaid taxes
              </h2>
              <p className="text-sm text-amber-900 leading-relaxed">
                Under Texas Tax Code §11.431, a late residence homestead exemption application
                can be filed up to 2 years past the delinquency date for the relevant tax year.
                Once approved, your county tax collector either deducts the exempted tax (if
                unpaid) or refunds you the difference (if already paid). The chief appraiser
                will not contact you about this proactively — the burden is on the homeowner to
                file. On a typical $400,000 home, a 2-year retroactive homestead can recover
                $2,000–$4,000 depending on the county and school district rates.
              </p>
              {exemptionsCta?.enabled && (
                <div className="mt-4">
                  <a
                    href={appendSid(exemptionsCta.url, 'texas-exemptions-guide')}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  >
                    {exemptionsCta.label}
                  </a>
                  <p className="mt-2 text-xs text-amber-900/80">{exemptionsCta.description}</p>
                </div>
              )}
            </div>
          </section>

          <Divider />

          {/* Exemption types table */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="types-heading">
            <h2 id="types-heading" className="text-2xl font-semibold text-text mb-4">
              The four core Texas residential exemptions
            </h2>
            <p className="text-sm text-text-muted mb-4 measure">
              The amounts below are the statewide minimums for school district M&amp;O taxes.
              County and city taxing units can — and many do — offer additional optional
              exemptions on top. Check your county appraisal district for local add-ons.
            </p>
            <div className="space-y-4">
              {EXEMPTIONS.map((e, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-text">{e.name}</h3>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/30 whitespace-nowrap shrink-0">
                      School M&amp;O: {e.schoolDistrictAmount}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mb-3 leading-relaxed">
                    {e.shortDescription}
                  </p>
                  <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="font-medium text-text mb-1">Eligibility</dt>
                      <dd className="text-text-muted">{e.eligibility}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-text mb-1">County / city</dt>
                      <dd className="text-text-muted">{e.countyCityNote}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* Worked example */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="example-heading">
            <h2 id="example-heading" className="text-2xl font-semibold text-text mb-4">
              Worked example — what these exemptions actually save you
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                Take a $400,000 home in a typical large-county school district with a 1.10%
                school M&amp;O tax rate (roughly the Texas statewide median). Without any
                exemption, the school portion of the bill is $400,000 × 1.10% = $4,400.
              </p>
              <p>
                With the general homestead exemption applied, the school district sees
                $400,000 − $140,000 = $260,000 in taxable value, so the school portion drops to
                $260,000 × 1.10% = $2,860. <strong className="text-text">Annual savings:
                roughly $1,540.</strong>
              </p>
              <p>
                If the homeowner is 65 or older or disabled, the school district sees
                $400,000 − $200,000 = $200,000, so the school portion drops to
                $200,000 × 1.10% = $2,200. <strong className="text-text">Annual savings:
                roughly $2,200 vs. unexempted</strong> — and the school portion is then frozen
                at that level via the tax ceiling, so future increases in your home's appraised
                value won't raise the school portion of your bill.
              </p>
              <p>
                County and city portions of the bill are separately reduced by any optional
                local homestead exemptions those taxing units have adopted, but the school
                M&amp;O reduction above is the largest single line item for almost every Texas
                homeowner.
              </p>
            </div>
          </section>

          <Divider />

          {/* How to file */}
          <section className="mb-10 mt-10 scroll-mt-24" aria-labelledby="file-heading">
            <h2 id="file-heading" className="text-2xl font-semibold text-text mb-4">
              How to file
            </h2>
            <div className="prose prose-lg max-w-[68ch] text-text-muted space-y-4">
              <p>
                You file with the county appraisal district where the property is located —{' '}
                <strong className="text-text">not</strong> the state, the county tax collector,
                or the school district. The form is{' '}
                <a
                  href="https://comptroller.texas.gov/forms/50-114.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-link"
                >
                  Form 50-114 (Residence Homestead Exemption Application)
                </a>{' '}
                — universal across all 254 Texas counties.
              </p>
              <p>
                Most appraisal districts accept the form online, by mail, or in person. You'll
                need a copy of your Texas driver's license or ID showing the property address
                as your residence, plus the form itself. Once approved, the exemption renews
                automatically each year unless you move or stop using the home as your
                principal residence.
              </p>
              <p>
                The statewide general deadline is April 30 of the tax year. After that, the
                late application window under §11.431 stays open up to 2 years past the
                delinquency date — so even if you bought several years ago and never filed,
                there's likely still recovery available for the most recent tax cycles.
              </p>
              <p>
                If filing the paperwork or pursuing retroactive recovery yourself sounds like
                more work than you want to do, a service like Ownwell will file general and
                senior exemptions on your behalf — including the retroactive 2-year window —
                for a percentage of the first year's savings. You pay nothing if no exemption
                is approved.
              </p>
            </div>
            {exemptionsCta?.enabled && (
              <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
                <a
                  href={appendSid(exemptionsCta.url, 'texas-exemptions-file-section')}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  {exemptionsCta.label}
                </a>
                <p className="mt-2 text-xs text-text-muted">
                  {exemptionsCta.description}
                </p>
              </div>
            )}
          </section>

          <Divider />

          {/* FAQ accordions */}
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
                Texas Comptroller of Public Accounts —{' '}
                <a
                  href="https://comptroller.texas.gov/taxes/property-tax/exemptions/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-link"
                >
                  Property Tax Exemptions overview
                </a>
                . Current exemption amounts, eligibility rules, and forms.
              </li>
              <li>
                Texas Tax Code §11.13 (Residence homestead) and §11.431 (Late application) —{' '}
                <a
                  href="https://statutes.capitol.texas.gov/Docs/TX/htm/TX.11.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-link"
                >
                  statutes.capitol.texas.gov
                </a>
                .
              </li>
              <li>
                Form 50-114 (Residence Homestead Exemption Application) —{' '}
                <a
                  href="https://comptroller.texas.gov/forms/50-114.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-link"
                >
                  Comptroller PDF
                </a>
                . Universal across all 254 Texas counties.
              </li>
              <li>
                Texas Tax Code §23.23 — 10% appraisal-value cap on residence homesteads.
                Operates independently from the exemptions described above.
              </li>
            </ul>
            <p className="text-xs text-text-muted mt-6 italic">
              This page provides editorial context and planning estimates only. Exemption
              amounts, eligibility rules, and filing windows can change — confirm with your
              county appraisal district before filing.
            </p>
          </section>

          {/* Related tools */}
          <section className="mb-10 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-text mb-3">Related tools</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/texas/property-tax-calculator" className="text-sm data-link">
                Texas property tax calculator
              </Link>
              <Link href="/texas/property-tax-appeal-calculator" className="text-sm data-link">
                Texas property tax appeal calculator
              </Link>
              <Link href="/texas/property-tax-rates" className="text-sm data-link">
                Texas rates by county
              </Link>
              <Link href="/texas" className="text-sm data-link">
                Texas overview
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
