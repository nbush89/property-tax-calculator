import { NextResponse } from 'next/server'
import { getBaseUrl, joinUrl, buildSitemapIndexXml, listStateSlugs } from '@/lib/sitemaps'

/**
 * Sitemap index route handler
 * Serves /sitemap.xml as a sitemap index pointing to partitioned sitemaps
 */
export async function GET() {
  try {
    const baseUrl = getBaseUrl()
    const now = new Date().toISOString()

    // Build list of sitemap URLs
    const sitemapUrls: Array<{ loc: string; lastmod: string }> = []

    // Static pages sitemap
    sitemapUrls.push({
      loc: joinUrl(baseUrl, '/sitemaps/static.xml'),
      lastmod: now,
    })

    // State-specific sitemaps
    const stateSlugs = listStateSlugs()
    for (const stateSlug of stateSlugs) {
      sitemapUrls.push({
        loc: joinUrl(baseUrl, `/sitemaps/${stateSlug}.xml`),
        lastmod: now,
      })
    }

    // Generate XML
    const xml = buildSitemapIndexXml(sitemapUrls)

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap index:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
