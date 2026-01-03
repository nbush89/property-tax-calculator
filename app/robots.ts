import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Robots.txt generation for Next.js App Router
 * 
 * Configures search engine crawling behavior.
 * Accessible at: /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL.replace(/\/$/, '') // Remove trailing slash

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

