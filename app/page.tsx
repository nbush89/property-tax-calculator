import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import Features from '@/components/landing/Features'
import ExamplePreview from '@/components/landing/ExamplePreview'
import FAQ from '@/components/landing/FAQ'
import CTASection from '@/components/landing/CTASection'
import { generateStructuredData, generateBreadcrumbStructuredData } from '@/utils/seo'

export const metadata: Metadata = {
  title: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
  description: 'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis—all free and no sign-up required.',
  keywords: 'New Jersey property tax, NJ property tax calculator, property tax estimator, New Jersey real estate taxes, NJ tax calculator',
  openGraph: {
    title: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
    description: 'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis.',
    type: 'website',
    images: [
      {
        url: '/logo-icon.png',
        width: 1200,
        height: 630,
        alt: 'NJ Property Tax Calculator',
      },
    ],
  },
}

const structuredData = generateStructuredData({
  title: 'NJ Property Tax Calculator',
  description: 'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis.',
  type: 'WebApplication',
})

const breadcrumbData = generateBreadcrumbStructuredData([
  { name: 'Home', url: 'https://yoursite.com/' },
])

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Header />
      <main className="min-h-screen">
        <Hero />
        <HowItWorks />
        <Features />
        <ExamplePreview />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
