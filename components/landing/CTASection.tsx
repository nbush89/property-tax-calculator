import { LinkButton } from '@/components/ui/Button'

export default function CTASection() {
  return (
    <section className="bg-primary py-16 sm:py-20">
      <div className="container-page text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready to Calculate Your Property Taxes?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
          Get your free estimate in seconds—no sign-up required.
        </p>
        <div className="mt-8">
          <LinkButton
            href="/new-jersey/property-tax-calculator"
            variant="secondary"
            size="lg"
            className="bg-white text-primary hover:bg-white/90"
          >
            Calculate Now
          </LinkButton>
        </div>
      </div>
    </section>
  )
}
