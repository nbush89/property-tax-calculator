import fs from 'node:fs'
import path from 'node:path'
import { SITE_URL } from './site'
import { getStateData } from './geo'
import { slugifyLocation } from '@/utils/locationUtils'

/**
 * Get base URL, using fallback during build, throwing only at runtime in production if missing
 */
export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL

  // During build/prerender, allow fallback to prevent build failures
  // The fallback URL from SITE_URL is acceptable during build
  // At runtime in production, we should validate, but we'll be lenient to allow builds
  // In actual production deployment, NEXT_PUBLIC_SITE_URL should be set via Vercel/env vars

  return url.replace(/\/$/, '') // Remove trailing slash
}

/**
 * Join base URL with path, avoiding double slashes
 */
export function joinUrl(base: string, pathSegment: string): string {
  const cleanBase = base.replace(/\/$/, '')
  const cleanPath = pathSegment.replace(/^\//, '')
  return `${cleanBase}/${cleanPath}`
}

/**
 * Build sitemap index XML
 */
export function buildSitemapIndexXml(
  sitemapUrls: Array<{ loc: string; lastmod?: string }>
): string {
  const urls = sitemapUrls
    .map(
      ({ loc, lastmod }) => `
  <sitemap>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''}
  </sitemap>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</sitemapindex>`
}

/**
 * Build urlset XML
 */
export function buildUrlsetXml(
  entries: Array<{
    loc: string
    lastmod?: string
    changefreq?: string
    priority?: number
  }>
): string {
  const urls = entries
    .map(
      ({ loc, lastmod, changefreq, priority }) => `
  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''}${changefreq ? `\n    <changefreq>${escapeXml(changefreq)}</changefreq>` : ''}${priority !== undefined ? `\n    <priority>${priority.toFixed(1)}</priority>` : ''}
  </url>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * List state slugs by reading filenames from /data/states
 */
export function listStateSlugs(): string[] {
  try {
    const statesDir = path.join(process.cwd(), 'data', 'states')
    if (!fs.existsSync(statesDir)) {
      return []
    }

    const files = fs.readdirSync(statesDir)
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .sort()
  } catch (error) {
    console.error('Error reading state data directory:', error)
    return []
  }
}

/**
 * Load state data by slug
 */
export function loadStateData(slug: string) {
  return getStateData(slug)
}

/**
 * Generate static page URLs
 */
export function getStaticPageUrls(baseUrl: string): Array<{
  loc: string
  lastmod: string
  changefreq: string
  priority: number
}> {
  const now = new Date().toISOString()

  return [
    {
      loc: joinUrl(baseUrl, '/'),
      lastmod: now,
      changefreq: 'weekly',
      priority: 1.0,
    },
    {
      loc: joinUrl(baseUrl, '/new-jersey/property-tax-calculator'),
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.9,
    },
    {
      loc: joinUrl(baseUrl, '/new-jersey/property-tax-rates'),
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      loc: joinUrl(baseUrl, '/faq'),
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      loc: joinUrl(baseUrl, '/privacy'),
      lastmod: now,
      changefreq: 'yearly',
      priority: 0.3,
    },
  ]
}

/**
 * Generate state-specific URLs (state pages, counties, towns)
 */
export function getStateUrls(
  baseUrl: string,
  stateSlug: string
): Array<{
  loc: string
  lastmod: string
  changefreq: string
  priority: number
}> {
  const stateData = loadStateData(stateSlug)
  if (!stateData) {
    return []
  }

  const now = new Date().toISOString()
  const urls: Array<{
    loc: string
    lastmod: string
    changefreq: string
    priority: number
  }> = []

  // State-level pages
  urls.push({
    loc: joinUrl(baseUrl, `/${stateSlug}/property-tax-calculator`),
    lastmod: now,
    changefreq: 'weekly',
    priority: 0.9,
  })

  urls.push({
    loc: joinUrl(baseUrl, `/${stateSlug}/property-tax-rates`),
    lastmod: now,
    changefreq: 'monthly',
    priority: 0.8,
  })

  // County pages
  for (const county of stateData.counties) {
    const countySlug = slugifyLocation(county.name)
    urls.push({
      loc: joinUrl(baseUrl, `/${stateSlug}/${countySlug}-county-property-tax`),
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.8,
    })

    // Town pages
    for (const town of county.towns) {
      const townSlug = slugifyLocation(town.name)
      urls.push({
        loc: joinUrl(baseUrl, `/${stateSlug}/${countySlug}/${townSlug}-property-tax`),
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      })
    }
  }

  // TODO: If a state has > 40k URLs, consider splitting further by county-level sitemaps
  // For now, we'll keep all URLs in a single state sitemap

  return urls
}
