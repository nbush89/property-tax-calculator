import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/sitemaps'

/**
 * Robots.txt generation for Next.js App Router
 *
 * Configures search engine crawling behavior.
 * References the sitemap index at /sitemap.xml
 * Accessible at: /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'], // Block API routes and Next.js internals
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
