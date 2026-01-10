import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import Features from '@/components/landing/Features'
import ExamplePreview from '@/components/landing/ExamplePreview'
import FAQ from '@/components/landing/FAQ'
import CTASection from '@/components/landing/CTASection'
import Feedback from '@/components/landing/Feedback'
import { buildMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, organizationJsonLd, websiteJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/site'

/**
 * Homepage metadata and JSON-LD structured data.
 * Includes: Organization, WebSite, WebApplication, and BreadcrumbList schemas.
 */
export const metadata = buildMetadata({
  title: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
  description:
    'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis—all free and no sign-up required.',
  path: '/',
  keywords:
    'New Jersey property tax, NJ property tax calculator, property tax estimator, New Jersey real estate taxes, NJ tax calculator',
  openGraph: {
    title: 'NJ Property Tax Calculator | Estimate Your New Jersey Property Taxes',
    description:
      'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis.',
    type: 'website',
    images: [
      {
        url: '/logo-icon.png',
        width: 512,
        height: 512,
        alt: 'NJ Property Tax Calculator',
      },
    ],
  },
})

export default function Home() {
  const pageUrl = `${SITE_URL}/`

  return (
    <>
      {/* Organization schema - identifies the site owner */}
      <JsonLd data={organizationJsonLd()} />
      {/* WebSite schema - identifies the website */}
      <JsonLd data={websiteJsonLd()} />
      {/* WebApplication schema - describes the calculator tool */}
      <JsonLd
        data={webAppJsonLd({
          pageUrl,
          description:
            'Calculate your New Jersey property taxes in seconds. Get accurate estimates with county and town breakdowns, exemptions support, and detailed analysis.',
        })}
      />
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', url: pageUrl }])} />
      <Header />
      <main className="min-h-screen">
        <Hero />
        <HowItWorks />
        <Features />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
