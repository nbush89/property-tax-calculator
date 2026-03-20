import type { Metadata } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Feedback from '@/components/landing/Feedback'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_NAME, SITE_URL } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: `Feedback | ${SITE_NAME}`,
  description: `Share feedback or report issues for ${SITE_NAME}. Help us improve the calculator and state coverage.`,
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
