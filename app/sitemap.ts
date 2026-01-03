import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { getAllCountyNames } from '@/utils/getCountyRates'
import { getMunicipalitiesByCounty } from '@/utils/getMunicipalRates'

/**
 * Sitemap generation for Next.js App Router
 * 
 * Generates sitemap.xml with:
 * - Static pages (homepage, FAQ, privacy, etc.)
 * - Dynamic New Jersey routes (counties and towns)
 * 
 * Accessible at: /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Validate SITE_URL is set (required for production)
  // In production, NEXT_PUBLIC_SITE_URL should be explicitly set
  // For local dev, we allow the fallback from lib/site.ts
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
    console.warn(
      'WARNING: NEXT_PUBLIC_SITE_URL is not set in production. Sitemap URLs may be incorrect.'
    )
  }

  const baseUrl = SITE_URL.replace(/\/$/, '') // Remove trailing slash
  const now = new Date()

  // Static pages with higher priority
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0, // Homepage highest priority
    },
    {
      url: `${baseUrl}/new-jersey/property-tax-calculator`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/new-jersey/property-tax-rates`,
      lastModified: now,
      changeFrequency: 'monthly', // Tax rates change less frequently
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly', // Privacy policy rarely changes
      priority: 0.3,
    },
  ]

  // Dynamic routes: New Jersey counties
  const countyPages: MetadataRoute.Sitemap = getAllCountyNames().map((county) => {
    const encodedCounty = encodeURIComponent(county)
    return {
      url: `${baseUrl}/new-jersey/${encodedCounty}/property-tax-calculator`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  // Dynamic routes: New Jersey towns/municipalities
  const townPages: MetadataRoute.Sitemap = getAllCountyNames().flatMap((county) => {
    const municipalities = getMunicipalitiesByCounty(county)
    const encodedCounty = encodeURIComponent(county)

    return municipalities.map((town) => {
      const encodedTown = encodeURIComponent(town)
      return {
        url: `${baseUrl}/new-jersey/${encodedCounty}/${encodedTown}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
      }
    })
  })

  // Combine all routes
  const allRoutes = [...staticPages, ...countyPages, ...townPages]

  // Remove duplicates (safety check)
  const uniqueRoutes = Array.from(
    new Map(allRoutes.map((route) => [route.url, route])).values()
  )

  return uniqueRoutes
}

