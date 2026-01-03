'use client'

import { useState } from 'react'
import Section from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'

type FAQItem = {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: 'Is this an official government tool?',
    answer:
      'No, this is an independent calculator that provides estimates based on publicly available tax rate data. For official tax information, please consult your county tax assessor\'s office.',
  },
  {
    question: 'How accurate is the estimate?',
    answer:
      'Our estimates are based on current county and municipal tax rates. While we strive for accuracy, actual property taxes may vary based on local assessment practices, recent rate changes, and property-specific factors. Always verify with your local tax assessor for official amounts.',
  },
  {
    question: 'Do you store my address or personal info?',
    answer:
      'No, we do not collect, store, or transmit any personal information. All calculations are performed locally in your browser. We don\'t require sign-ups, accounts, or any personal data.',
  },
  {
    question: 'Does this include school taxes?',
    answer:
      'Yes, our calculations include all property tax components including county, municipal, school, and other local taxes. The breakdown shows how your total tax is distributed across these categories.',
  },
  {
    question: 'What exemptions are supported?',
    answer:
      'We support several common New Jersey exemptions including Senior Citizen Freeze ($250), Veteran ($6,000), and Disabled Person ($3,500). Select applicable exemptions in the calculator to see how they affect your tax amount.',
  },
  {
    question: 'Can I use this for any NJ county?',
    answer:
      'Yes! Our calculator supports all 21 counties in New Jersey. Simply select your county from the dropdown, and optionally choose your municipality for more precise calculations.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <Section
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about our property tax calculator"
      className="bg-bg"
    >
      <div className="mt-12 max-w-3xl mx-auto space-y-4">
        {faqData.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            <button
              onClick={() => toggleQuestion(index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="font-semibold text-text">
                {item.question}
              </span>
              <svg
                className={`h-5 w-5 text-text-muted transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === index && (
              <div className="border-t border-border px-6 py-4">
                <p className="muted">{item.answer}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </Section>
  )
}
