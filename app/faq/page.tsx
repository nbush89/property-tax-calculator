import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import FAQ from '@/components/landing/FAQ'
import { faqData } from '@/data/faqData'
import { faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/site'

/**
 * FAQ page metadata and JSON-LD structured data.
 * Includes: FAQPage and BreadcrumbList schemas.
 */
export const metadata = buildMetadata({
  title: 'Frequently Asked Questions | NJ Property Tax Calculator',
  description: 'Get answers to common questions about the New Jersey property tax calculator, accuracy, exemptions, and how to use the tool.',
  path: '/faq',
  keywords: 'NJ property tax FAQ, property tax calculator questions, New Jersey tax exemptions',
})

export default function FAQPage() {
  const pageUrl = `${SITE_URL}/faq`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'FAQ', url: pageUrl },
        ])}
      />
      {/* FAQPage schema - structured Q&A data */}
      <JsonLd data={faqJsonLd(pageUrl, faqData)} />
      <Header />
      <main className="min-h-screen bg-white dark:bg-slate-900">
        <FAQ />
      </main>
      <Footer />
    </>
  )
}

