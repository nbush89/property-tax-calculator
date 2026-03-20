import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import { getStatesForHero } from '@/lib/geo'
import Features from '@/components/landing/Features'
import FAQ from '@/components/landing/FAQ'
import CTASection from '@/components/landing/CTASection'
import { buildMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, organizationJsonLd, websiteJsonLd, webAppJsonLd } from '@/lib/jsonld'
import { SITE_NAME, SITE_URL } from '@/lib/site'

/**
 * Homepage metadata and JSON-LD structured data.
 * Includes: Organization, WebSite, WebApplication, and BreadcrumbList schemas.
 */
export const metadata = buildMetadata({
  title: `${SITE_NAME} | Property tax calculator & rates by state`,
  description:
    'Estimate and compare property taxes by state, county, and town. Planning-focused calculator, published rates, and trend context—New Jersey, Texas, and expanding coverage. Free, no sign-up.',
  path: '/',
  keywords:
    'property tax calculator, property tax by state, county tax rates, New Jersey property tax, Texas property tax, home property tax',
  openGraph: {
    title: `${SITE_NAME} | Property tax calculator & rates by state`,
    description:
      'Run multi-state property tax planning estimates, browse county and town pages, and review methodology and sources.',
    type: 'website',
    images: [
      {
        url: '/logo-icon.png',
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
})

export default function Home() {
  const pageUrl = `${SITE_URL}/`
  const statesForHero = getStatesForHero()

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
            'Property tax planning estimates and comparisons by state, county, and town using public data.',
        })}
      />
      {/* BreadcrumbList schema - navigation hierarchy */}
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', url: pageUrl }])} />
      <Header />
      <main className="min-h-screen">
        <Hero statesForHero={statesForHero} />
        <HowItWorks />
        <Features />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
