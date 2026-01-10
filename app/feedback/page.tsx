import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Feedback from '@/components/landing/Feedback'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: 'Feedback | NJ Property Tax Calculator',
  description:
    'Share your feedback, suggestions, or report issues with the NJ Property Tax Calculator. Help us improve the tool.',
  path: '/feedback',
  keywords: 'feedback, suggestions, report issue, contact',
})

export default function FeedbackPage() {
  const pageUrl = `${SITE_URL}/feedback`

  return (
    <>
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Feedback', url: pageUrl },
        ])}
      />
      <Header />
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Feedback />
        </div>
      </main>
      <Footer />
    </>
  )
}
