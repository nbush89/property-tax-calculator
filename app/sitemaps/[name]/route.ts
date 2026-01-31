import { NextRequest, NextResponse } from 'next/server'
import {
  getBaseUrl,
  buildUrlsetXml,
  getStaticPageUrls,
  getStateUrls,
  listStateSlugs,
} from '@/lib/sitemaps'

/**
 * Partitioned sitemap route handler
 * Serves /sitemaps/{name}.xml (via rewrite) or /sitemaps/{name}
 *
 * Handles:
 * - /sitemaps/static.xml - static pages
 * - /sitemaps/{state-slug}.xml - state-specific pages (counties, towns)
 */
export async function GET(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params
    const baseUrl = getBaseUrl()

    let urls: Array<{
      loc: string
      lastmod: string
      changefreq?: string
      priority?: number
    }> = []

    if (name === 'static') {
      // Static pages sitemap
      urls = getStaticPageUrls(baseUrl)
    } else {
      // Check if it's a valid state slug
      const stateSlugs = listStateSlugs()
      if (stateSlugs.includes(name)) {
        // State-specific sitemap
        urls = getStateUrls(baseUrl, name)
      } else {
        // Unknown sitemap name - return 404
        return new NextResponse('Sitemap not found', { status: 404 })
      }
    }

    // Remove duplicates (safety check)
    const uniqueUrls = Array.from(new Map(urls.map(url => [url.loc, url])).values())

    // Generate XML
    const xml = buildUrlsetXml(uniqueUrls)

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error(`Error generating sitemap for ${name}:`, error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
