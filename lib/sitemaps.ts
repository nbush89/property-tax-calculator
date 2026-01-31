import fs from 'node:fs'
import path from 'node:path'
import { SITE_URL } from './site'
import { getStateData } from './geo'
import { slugifyLocation } from '@/utils/locationUtils'
import type { TownData, StateData } from '@/lib/data/types'

/**
 * Get base URL, using fallback during build, throwing only at runtime in production if missing
 */
export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL
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
 * Build urlset XML. changefreq/priority are optional (only static pages use them).
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
 * Escape XML special characters (keeps output valid)
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
export function loadStateData(slug: string): StateData | null {
  return getStateData(slug)
}

/**
 * Deterministic "published/live" filter: include town in sitemap and county listings only when
 * it has real data (no future/placeholder towns). We filter so crawlers and users only see URLs
 * that resolve to meaningful content.
 */
export function isTownPublished(town: TownData | Record<string, unknown>): boolean {
  const t = town as Record<string, unknown>
  if (t.isLive === true) {
    return true
  }
  const metrics = t.metrics as
    | { effectiveTaxRate?: unknown[]; averageResidentialTaxBill?: unknown[] }
    | undefined
  if (!metrics) {
    return false
  }
  const hasRate = (metrics.effectiveTaxRate?.length ?? 0) > 0
  const hasBill = (metrics.averageResidentialTaxBill?.length ?? 0) > 0
  return hasRate || hasBill
}

/**
 * Compute lastmod for a state: prefer asOfYear (data vintage) so we don't claim "updated today"
 * on every build. Fall back to state JSON file mtime when asOfYear is missing.
 */
export function getStateLastmod(stateSlug: string, stateData: StateData | null): string {
  const asOfYear = stateData?.state?.asOfYear
  if (asOfYear != null && typeof asOfYear === 'number') {
    return `${asOfYear}-12-31`
  }
  const filePath = path.join(process.cwd(), 'data', 'states', `${stateSlug}.json`)
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath)
      return stat.mtime.toISOString()
    }
  } catch {
    // ignore
  }
  return new Date().toISOString()
}

/**
 * Generate static page URLs only (truly global: home, faq, about, etc.).
 * State-specific routes like /new-jersey/property-tax-calculator live in getStateUrls to avoid duplicates.
 */
export function getStaticPageUrls(baseUrl: string): Array<{
  loc: string
  lastmod: string
  changefreq?: string
  priority?: number
}> {
  // Use a stable lastmod for static pages: build-time is acceptable for rarely-changing pages
  const now = new Date().toISOString()

  return [
    {
      loc: joinUrl(baseUrl, '/'),
      lastmod: now,
      changefreq: 'weekly',
      priority: 1.0,
    },
    {
      loc: joinUrl(baseUrl, '/faq'),
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      loc: joinUrl(baseUrl, '/about'),
      lastmod: now,
      changefreq: 'yearly',
      priority: 0.7,
    },
    {
      loc: joinUrl(baseUrl, '/methodology'),
      lastmod: now,
      changefreq: 'yearly',
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
 * Generate state-specific URLs (state overview, calculator, rates, counties, towns).
 * Uses state/county/town asOfYear or file mtime for lastmod instead of "now" on every build.
 */
export function getStateUrls(
  baseUrl: string,
  stateSlug: string
): Array<{
  loc: string
  lastmod: string
  changefreq?: string
  priority?: number
}> {
  const stateData = loadStateData(stateSlug)
  if (!stateData) {
    return []
  }

  // One state-level lastmod: from data vintage (asOfYear) or state JSON file mtime.
  // We avoid new Date().toISOString() per URL so sitemaps don't churn every build.
  const stateLastmod = getStateLastmod(stateSlug, stateData)

  const urls: Array<{
    loc: string
    lastmod: string
    changefreq?: string
    priority?: number
  }> = []

  // State overview route (e.g. /new-jersey) – exists in app
  urls.push({
    loc: joinUrl(baseUrl, `/${stateSlug}`),
    lastmod: stateLastmod,
  })

  // State-level sub-pages (calculator, rates)
  urls.push({
    loc: joinUrl(baseUrl, `/${stateSlug}/property-tax-calculator`),
    lastmod: stateLastmod,
  })

  urls.push({
    loc: joinUrl(baseUrl, `/${stateSlug}/property-tax-rates`),
    lastmod: stateLastmod,
  })

  // County pages and county town index (only if at least one published town)
  for (const county of stateData.counties) {
    const countySlug = slugifyLocation(county.name)
    const countyRouteSegment = `${countySlug}-county-property-tax`
    const publishedTowns = (county.towns || []).filter(t => isTownPublished(t))

    urls.push({
      loc: joinUrl(baseUrl, `/${stateSlug}/${countyRouteSegment}`),
      lastmod: stateLastmod,
    })

    if (publishedTowns.length > 0) {
      urls.push({
        loc: joinUrl(baseUrl, `/${stateSlug}/${countyRouteSegment}/towns`),
        lastmod: stateLastmod,
      })
    }

    // Town pages: only published towns (have metrics so page is meaningful)
    for (const town of publishedTowns) {
      const townSlug = (town as TownData).slug || slugifyLocation((town as TownData).name)
      const townLastmod =
        (town as TownData).asOfYear != null ? `${(town as TownData).asOfYear}-12-31` : stateLastmod
      urls.push({
        loc: joinUrl(baseUrl, `/${stateSlug}/${countySlug}/${townSlug}-property-tax`),
        lastmod: townLastmod,
      })
    }
  }

  return urls
}
