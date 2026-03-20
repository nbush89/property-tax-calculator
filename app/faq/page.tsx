import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import FAQ from '@/components/landing/FAQ'
import { faqData } from '@/data/faqData'
import { faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildMetadata } from '@/lib/seo'
import { SITE_NAME, SITE_URL } from '@/lib/site'

/**
 * FAQ page metadata and JSON-LD structured data.
 * Includes: FAQPage and BreadcrumbList schemas.
 */
export const metadata = buildMetadata({
  title: `Frequently Asked Questions | ${SITE_NAME}`,
  description:
    'Answers about the property tax calculator, planning estimates, exemptions and relief, accuracy, and supported states (including New Jersey and Texas).',
  path: '/faq',
  keywords:
    'property tax FAQ, property tax calculator questions, state property tax exemptions, NJ property tax, Texas property tax',
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
