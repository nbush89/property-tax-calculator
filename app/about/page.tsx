import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: `About ${SITE_NAME} | Property Tax Planning Tool`,
  description: `Learn how ${SITE_NAME} helps homeowners and buyers estimate and compare property taxes using public data.`,
  path: '/about',
  keywords: 'about, property tax planning, tax estimation tool, transparency',
})

export default function AboutPage() {
  const pageUrl = `${SITE_URL}/about`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'About', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-text mb-4">About {SITE_NAME}</h1>

          <div className="prose prose-lg mt-8 max-w-none text-text-muted">
            {/* Section: What this site does */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">What This Site Does</h2>
              <p className="mb-4">
                {SITE_NAME} is an independent planning tool designed to help homeowners and
                prospective buyers estimate and compare property tax obligations across New Jersey.
                Our calculator uses publicly available data from state and federal sources to
                provide planning-level estimates that help users understand relative tax burden
                between different locations.
              </p>
              <p className="mb-4">
                The tool focuses on clarity, transparency, and comparison. Rather than claiming
                exact accuracy, we emphasize that property tax estimates are planning aids—useful
                for budgeting, comparing locations, and understanding how tax rates vary by county
                and municipality. All calculations are explainable, and all data sources are clearly
                identified.
              </p>
              <p>
                Our goal is to make property tax information more accessible and understandable,
                enabling better-informed decisions without requiring users to navigate complex
                government documents or perform manual calculations.
              </p>
            </section>

            {/* Section: Who it's for */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">Who This Site Is For</h2>
              <p className="mb-4">
                This tool is designed for anyone who needs to understand property tax implications
                in New Jersey:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  <strong className="font-semibold text-text">Homeowners</strong> planning their
                  annual budgets or evaluating whether to appeal their assessments
                </li>
                <li>
                  <strong className="font-semibold text-text">Prospective buyers</strong> comparing
                  tax burden across different counties and municipalities
                </li>
                <li>
                  <strong className="font-semibold text-text">Real estate professionals</strong>{' '}
                  providing clients with quick tax estimates during property searches
                </li>
                <li>
                  <strong className="font-semibold text-text">Anyone</strong> seeking to understand
                  how property taxes vary across New Jersey's diverse communities
                </li>
              </ul>
              <p>
                The tool is free to use, requires no sign-up or account creation, and performs all
                calculations locally in your browser to protect your privacy.
              </p>
            </section>

            {/* Section: What this site is not */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">What This Site Is Not</h2>
              <p className="mb-4">
                It's important to understand what this tool is <em>not</em>:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  <strong className="font-semibold text-text">
                    Not an official tax authority.
                  </strong>{' '}
                  We are not affiliated with any government agency, and our estimates are not
                  official tax bills or assessments.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Not a replacement for professional advice.
                  </strong>{' '}
                  For legal, financial, or tax planning decisions, consult qualified professionals
                  such as certified public accountants, tax attorneys, or financial advisors.
                </li>
                <li>
                  <strong className="font-semibold text-text">Not a guarantee of accuracy.</strong>{' '}
                  Actual tax bills depend on individual property assessments, exemptions,
                  abatements, and local tax decisions that cannot be predicted by averages or
                  historical data.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Not a predictor of future taxes.
                  </strong>{' '}
                  Tax rates and assessments change based on municipal budgets, school funding needs,
                  and property reassessments that occur independently of historical trends.
                </li>
              </ul>
              <p>
                Always verify tax information with your local tax assessor's office and rely on
                official tax bills for actual obligations.
              </p>
            </section>

            {/* Section: Transparency & data ethics */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">Transparency & Data Ethics</h2>
              <p className="mb-4">
                We believe transparency builds trust. This site is built with several principles in
                mind:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  <strong className="font-semibold text-text">Public data only.</strong> We use only
                  publicly available data from government sources, never proprietary or purchased
                  datasets.
                </li>
                <li>
                  <strong className="font-semibold text-text">Clear source attribution.</strong>{' '}
                  Every metric displayed on this site includes information about its data source and
                  the year it represents.
                </li>
                <li>
                  <strong className="font-semibold text-text">Explainable calculations.</strong> Our
                  methodology is documented, and we avoid "black box" calculations that users cannot
                  understand or verify.
                </li>
                <li>
                  <strong className="font-semibold text-text">No user tracking.</strong> We do not
                  require accounts, and calculations are performed locally in your browser. We do
                  not sell or share user data.
                </li>
                <li>
                  <strong className="font-semibold text-text">Responsible scaling.</strong> As we
                  expand to additional states, we maintain the same standards for data quality,
                  source attribution, and clear limitations.
                </li>
              </ul>
              <p>
                If you have questions about our data sources, methodology, or how estimates are
                calculated, please see our{' '}
                <a href="/methodology" className="text-primary hover:text-primary-hover underline">
                  Methodology page
                </a>{' '}
                for detailed information.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
