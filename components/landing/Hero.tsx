import Image from 'next/image'
import { LinkButton } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-bg-gradient-from to-bg-gradient-to py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left Column: Content */}
          <div className="text-center lg:text-left">
            {/* Headline */}
            <h1 className="mb-6 text-3xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
              Compare property taxes across U.S. states, counties, and towns.
            </h1>

            {/* Subheadline */}
            <p className="mb-6 max-w-2xl text-lg text-text-muted sm:text-xl">
              Explore county and town-level context, trends, and planning estimates using public
              data.
            </p>

            {/* Disclaimer */}
            <p className="mb-8 text-xs text-text-muted">
              Planning estimates only — verify details with local assessments and exemptions.
            </p>

            {/* CTAs */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <LinkButton href="/new-jersey/property-tax-calculator" variant="primary" size="lg">
                Start calculator
              </LinkButton>
              <LinkButton href="/new-jersey" variant="secondary" size="lg">
                Browse counties
              </LinkButton>
            </div>
            <p className="mb-8 text-xs text-text-muted">
              Currently available for New Jersey. More states coming soon.
            </p>
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Badge variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Free
              </Badge>
              <Badge variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                No sign-up
              </Badge>
              <Badge variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Public data
              </Badge>
            </div>
          </div>

          {/* Right Column: Preview Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="rounded-lg border border-border bg-surface p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-text">Estimate Preview</h3>

                {/* Form Fields */}
                <div className="space-y-4 mb-6">
                  {/* County Selector */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-muted">County</label>
                    <div className="rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text-muted">
                      Select county...
                    </div>
                  </div>

                  {/* Town Selector */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-muted">Town</label>
                    <div className="rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text-muted">
                      Select town...
                    </div>
                  </div>

                  {/* Home Value Input */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-muted">
                      Home value
                    </label>
                    <div className="rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text-muted">
                      Enter home value...
                    </div>
                  </div>
                </div>

                {/* Trend Chart Placeholder */}
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-xs font-medium text-text-muted">
                    Trends available where data exists
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((label, index) => (
                      <div key={label} className="flex flex-1 flex-col items-center">
                        <div className="mb-2 flex h-16 w-full items-end justify-center">
                          <div
                            className="w-full rounded-t bg-primary/30"
                            style={{ height: `${60 + index * 5}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
