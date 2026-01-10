import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: 'Property Tax Methodology | How Estimates Are Calculated',
  description:
    'Understand how property tax estimates are calculated, which data sources are used, and how to interpret the results.',
  path: '/methodology',
  keywords: 'property tax methodology, tax calculation, data sources, tax estimation',
})

export default function MethodologyPage() {
  const pageUrl = `${SITE_URL}/methodology`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Methodology', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-text mb-4">
            Property Tax Estimation Methodology
          </h1>

          <div className="prose prose-lg mt-8 max-w-none text-text-muted">
            {/* Section: Overview */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">
                Overview: What "Planning Estimate" Means
              </h2>
              <p className="mb-4">
                The estimates provided by this tool are{' '}
                <strong className="font-semibold text-text">planning-level calculations</strong>{' '}
                based on published averages and rates. They are designed to help you understand
                relative tax burden and compare different locations, not to predict your exact tax
                bill.
              </p>
              <p className="mb-4">
                Actual property tax bills depend on many factors that vary by individual property:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Your property's assessed value (which may differ from market value)</li>
                <li>Exemptions you qualify for (senior, veteran, disabled, etc.)</li>
                <li>Abatements or special programs in your municipality</li>
                <li>Recent reassessments or appeals</li>
                <li>Municipal budget decisions made after the data was published</li>
              </ul>
              <p>
                Our estimates use published averages and rates to provide a baseline for comparison.
                They are most useful when comparing multiple locations or understanding how tax
                burden varies across counties and municipalities.
              </p>
            </section>

            {/* Section: Data sources */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">Data Sources</h2>
              <p className="mb-4">
                We use publicly available data from government sources. Each metric on this site
                includes information about its source and the year it represents. Our primary data
                sources include:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  <strong className="font-semibold text-text">
                    NJ Division of Taxation – MOD IV Average Residential Tax Report
                  </strong>
                  <br />
                  Provides county and municipality average residential tax bills by tax year. This
                  data represents the average tax bill paid by residential property owners in each
                  jurisdiction.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    NJ Division of Taxation – General & Effective Tax Rates
                  </strong>
                  <br />
                  Provides effective property tax rates by county and municipality. The effective
                  rate represents the percentage of assessed value that property owners pay in
                  taxes.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    U.S. Census Bureau – ACS 5-year estimates
                  </strong>
                  <br />
                  Provides median home value data (DP04_0089E) for owner-occupied housing units.
                  This is a 5-year rolling average that provides stable estimates for smaller
                  geographic areas.
                </li>
              </ul>
              <p>
                All data sources are clearly labeled on each page, and we link to the original
                government publications where available. We update our data as new reports are
                published, but different datasets update on different schedules, which is why you
                may see different years for different metrics.
              </p>
            </section>

            {/* Section: How estimates are calculated */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">
                How Estimates Are Calculated
              </h2>
              <p className="mb-4">
                Our calculator uses straightforward calculations based on published data:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  <strong className="font-semibold text-text">Average residential tax bill:</strong>{' '}
                  We display the published average tax bill for each county or municipality directly
                  from the NJ Division of Taxation's MOD IV report. This is not calculated—it's the
                  official average reported by the state.
                </li>
                <li>
                  <strong className="font-semibold text-text">Effective tax rate:</strong> We use
                  the published effective tax rate from the NJ Division of Taxation's General &
                  Effective Tax Rates report. When you enter a home value, we multiply it by this
                  rate to estimate annual taxes.
                </li>
                <li>
                  <strong className="font-semibold text-text">Median home value:</strong> We display
                  the U.S. Census Bureau's ACS 5-year median home value estimate for context. This
                  helps users understand typical home values in an area relative to tax rates.
                </li>
                <li>
                  <strong className="font-semibold text-text">Derived comparisons:</strong> When we
                  show comparisons (e.g., "higher than county average" or "lower than state
                  average"), these are simple arithmetic comparisons of published averages. They are
                  illustrative, not predictive.
                </li>
              </ul>
              <p className="mb-4">
                <strong className="font-semibold text-text">Important:</strong> We do not model
                individual property assessments, exemptions, abatements, or appeals. If you qualify
                for exemptions or have a property with a unique assessment history, your actual tax
                bill will differ from our estimates.
              </p>
              <p>
                <strong className="font-semibold text-text">Fallback logic:</strong> For town-level
                pages, if town-specific data is not available, we fall back to county-level data and
                clearly label it as "county context." This ensures users always have useful
                comparison data, even when town-level metrics aren't published.
              </p>
            </section>

            {/* Section: Year scoping & data lag */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">Year Scoping & Data Lag</h2>
              <p className="mb-4">
                Different government datasets are published on different schedules, and there is
                often a lag between when taxes are assessed and when aggregate data becomes
                available. This is why you may see different years for different metrics on the same
                page.
              </p>
              <p className="mb-4">For example:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  The NJ Division of Taxation's MOD IV report for a given tax year is typically
                  published several months after that tax year ends.
                </li>
                <li>
                  The U.S. Census Bureau's ACS 5-year estimates are released annually but represent
                  a rolling 5-year period, so they may not reflect the most recent year's data.
                </li>
                <li>
                  Effective tax rate reports may be published on a different schedule than average
                  tax bill reports.
                </li>
              </ul>
              <p className="mb-4">
                <strong className="font-semibold text-text">
                  We always label the year explicitly.
                </strong>{' '}
                Every metric displayed on this site includes the year it represents (e.g., "2024
                Average Residential Tax Bill" or "Effective Rate (2024)"). This transparency helps
                you understand that estimates are based on the most recent available data, which may
                not be the current calendar year.
              </p>
              <p>
                When viewing historical charts or trends, you'll see data points labeled by year.
                This helps you understand how taxes have changed over time while being clear that
                past trends do not guarantee future rates.
              </p>
            </section>

            {/* Section: Limitations & important notes */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-text">
                Limitations & Important Notes
              </h2>
              <p className="mb-4">
                To use this tool effectively, it's important to understand its limitations:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  <strong className="font-semibold text-text">Individual tax bills vary.</strong>{' '}
                  Your actual tax bill depends on your property's assessed value, which may differ
                  significantly from market value or the median home value in your area.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Assessments change independently.
                  </strong>{' '}
                  Your municipality may reassess properties, which can change your tax bill even if
                  tax rates remain constant. We cannot predict when reassessments will occur.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Exemptions and appeals are not modeled.
                  </strong>{' '}
                  If you qualify for senior, veteran, disabled, or other exemptions, your actual tax
                  bill will be lower than our estimates. Similarly, if you successfully appeal your
                  assessment, your bill will change.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Municipal decisions affect future taxes.
                  </strong>{' '}
                  School budgets, municipal spending, and county obligations all influence tax
                  rates. These decisions are made annually and cannot be predicted from historical
                  averages.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Data represents averages, not individual properties.
                  </strong>{' '}
                  The average residential tax bill for a municipality includes all residential
                  properties—from small condos to large estates. Your property may be above or below
                  this average.
                </li>
                <li>
                  <strong className="font-semibold text-text">
                    Historical trends are not guarantees.
                  </strong>{' '}
                  While we show historical data to provide context, past trends do not predict
                  future tax levels. Municipal budgets and property reassessments can cause
                  significant year-over-year changes.
                </li>
              </ul>
              <p className="mb-4">
                <strong className="font-semibold text-text">
                  When to verify with your tax assessor:
                </strong>
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Before making a property purchase decision</li>
                <li>When planning your annual budget</li>
                <li>If you're considering appealing your assessment</li>
                <li>If you're applying for exemptions</li>
                <li>If you need exact figures for tax planning or financial planning</li>
              </ul>
              <p>
                This tool is designed for planning and comparison, not as a replacement for official
                tax bills or professional tax advice. Always verify important tax information with
                your local tax assessor's office.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
