import Section from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'

export default function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Enter home value',
      description:
        'Enter your property\’s assessed or estimated value to create a planning estimate.',
      icon: (
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      number: '2',
      title: 'Choose county/town',
      description:
        'Select your county and optionally your municipality for location-specific context.',
      icon: (
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      number: '3',
      title: 'Get your estimate',
      description:
        'View estimated annual and monthly totals, contextual breakdowns, exemptions, and trends.',
      icon: (
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ]

  return (
    <Section title="How It Works" subtitle="Get your property tax estimate in three simple steps">
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map(step => (
          <Card key={step.number} className="p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
                {step.icon}
              </div>
              <span className="text-2xl font-semibold text-text-muted">{step.number}</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-text">{step.title}</h3>
            <p className="muted">{step.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  )
}
