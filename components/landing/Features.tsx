import Section from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'

export default function Features() {
  const features = [
    {
      title: 'County + Town Breakdown',
      description: 'See exactly how your taxes are calculated with detailed county and municipal rate breakdowns.',
      icon: (
        <svg
          className="h-6 w-6 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      title: 'Monthly + Annual Totals',
      description: 'Get both annual and monthly tax amounts to help with budgeting and financial planning.',
      icon: (
        <svg
          className="h-6 w-6 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'Exemptions Support',
      description: 'Factor in senior freeze, veteran, and disabled person exemptions to see your actual tax burden.',
      icon: (
        <svg
          className="h-6 w-6 text-primary"
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
      ),
    },
    {
      title: '5-Year Trend Preview',
      description: 'Visualize how your property taxes have changed over the past five years with interactive charts.',
      icon: (
        <svg
          className="h-6 w-6 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
  ]

  return (
    <Section
      title="Everything You Need"
      subtitle="Comprehensive property tax calculations with detailed insights"
      className="bg-bg"
    >
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <Card key={index} className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft">
              {feature.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              {feature.title}
            </h3>
            <p className="text-sm muted">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  )
}
