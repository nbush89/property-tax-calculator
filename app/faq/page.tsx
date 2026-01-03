import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import FAQ from '@/components/landing/FAQ'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | NJ Property Tax Calculator',
  description: 'Get answers to common questions about the New Jersey property tax calculator, accuracy, exemptions, and how to use the tool.',
  keywords: 'NJ property tax FAQ, property tax calculator questions, New Jersey tax exemptions',
}

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-slate-900">
        <FAQ />
      </main>
      <Footer />
    </>
  )
}

