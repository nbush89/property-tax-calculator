import { LinkButton } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import HeroEstimateForm from '@/components/landing/HeroEstimateForm'
import type { StateOptionForHero } from '@/lib/geo'

type HeroProps = {
  statesForHero: StateOptionForHero[]
}

const DATA_SOURCES = [
  { label: 'NJ Division of Taxation', detail: 'County & town rates' },
  { label: 'U.S. Census ACS', detail: 'Median taxes & home values' },
  { label: 'TX Comptroller', detail: 'County-level data' },
]

export default function Hero({ statesForHero }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-bg-gradient-from to-bg-gradient-to py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Left Column: Content */}
          <div className="text-center lg:text-left">
            {/* Headline */}
            <h1 className="mb-6 text-3xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
              Find what you&apos;ll actually pay in property tax.
            </h1>

            {/* Subheadline */}
            <p className="mb-6 max-w-2xl text-lg text-text-muted sm:text-xl">
              County and town-level rates, trends, and planning estimates built from public data.
              No sign-up, no ads, no guesswork.
            </p>

            {/* CTAs */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <LinkButton href="/property-tax-calculator" variant="primary" size="lg">
                Go to calculator →
              </LinkButton>
              <LinkButton href="/property-tax-rates" variant="secondary" size="lg">
                Browse rates by state
              </LinkButton>
            </div>
            <p className="mb-8 text-xs text-text-muted">
              New Jersey and Texas covered, with more states coming soon.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Badge variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Free
              </Badge>
              <Badge variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                No sign-up
              </Badge>
              <Badge variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Public data sources
              </Badge>
            </div>
          </div>

          {/* Right Column: Estimate form + trust panel */}
          <div className="flex flex-col gap-5 lg:items-end">
            <HeroEstimateForm states={statesForHero} />

            {/* Data sources trust panel */}
            <div className="w-full max-w-md rounded-lg border border-border bg-surface/60 px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Data sources
              </p>
              <ul className="space-y-2">
                {DATA_SOURCES.map(s => (
                  <li key={s.label} className="flex items-start gap-2 text-sm">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span>
                      <span className="font-medium text-text">{s.label}</span>
                      <span className="text-text-muted"> — {s.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-text-muted border-t border-border pt-3">
                Planning estimates only. Always verify with your county assessor and local tax
                authority.{' '}
                <a href="/methodology" className="underline hover:text-primary">
                  See methodology →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
