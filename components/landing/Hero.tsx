import { LinkButton } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import HeroEstimateForm from '@/components/landing/HeroEstimateForm'
import type { StateOptionForHero } from '@/lib/geo'

type HeroProps = {
  statesForHero: StateOptionForHero[]
}

export default function Hero({ statesForHero }: HeroProps) {
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
              <LinkButton href="/property-tax-calculator" variant="primary" size="lg">
                Continue to calculator →
              </LinkButton>
              <LinkButton href="/property-tax-rates" variant="secondary" size="lg">
                Browse rates by state
              </LinkButton>
            </div>
            <p className="mb-8 text-xs text-text-muted">
              Available for New Jersey and Texas, with more states coming soon.
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

          {/* Right Column: Estimate form */}
          <div className="flex justify-center lg:justify-end">
            <HeroEstimateForm states={statesForHero} />
          </div>
        </div>
      </div>
    </section>
  )
}
