import Image from 'next/image'
import { LinkButton } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-primary-soft/50 py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="flex flex-col items-center text-center">
          {/* Logo Icon */}
          <div className="mb-8">
            <Image
              src="/logo-icon.png"
              alt="NJ Property Tax Calculator"
              width={80}
              height={80}
              priority
              className="mx-auto h-20 w-20"
            />
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
            Estimate Your New Jersey
            <br />
            <span className="text-primary">Property Taxes in Seconds</span>
          </h1>

          {/* Subheadline */}
          <p className="mb-8 max-w-2xl text-lg text-text-muted sm:text-xl">
            Get accurate property tax estimates with county and town breakdowns, exemption support, and detailed analysis—all without signing up.
          </p>

          {/* CTAs */}
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <LinkButton
              href="/new-jersey/property-tax-calculator"
              variant="primary"
              size="lg"
            >
              Calculate NJ Taxes
            </LinkButton>
            <LinkButton
              href="/new-jersey/property-tax-rates"
              variant="secondary"
              size="lg"
            >
              See County Rates
            </LinkButton>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge variant="success">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Mobile friendly
            </Badge>
          </div>
        </div>
      </div>
    </section>
  )
}
