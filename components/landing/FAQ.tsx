'use client'

import { useState } from 'react'
import Section from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { faqData } from '@/data/faqData'

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
