/* eslint-disable no-console */
/**
 * Dump current SEO title/description for a hard-coded set of high-priority URLs
 * surfaced by the admin SEO Opportunities dashboard. Use to see what Google is
 * actually showing for each high-impression, low-CTR page so we can prioritize
 * title/meta rewrites.
 *
 * Run: npx tsx scripts/dump-seo-metadata.ts
 */
import { buildTownSeoFields } from '../lib/seo/townMetadata'
import { resolveTownPageOverview } from '../lib/town-overview/resolve-page-overview'
import { getStateData, getCountyBySlug, getTownBySlugs } from '../lib/geo'

const TARGETS: Array<{ path: string; imp: number; clk: number; pos: number; entity: string }> = [
  // TX top impressions, near-zero clicks
  { path: '/texas/travis/austin-property-tax', imp: 3120, clk: 0, pos: 10.4, entity: 'town' },
  { path: '/texas/harris/houston-property-tax', imp: 1757, clk: 1, pos: 11.4, entity: 'town' },
  { path: '/texas/harris-county-property-tax', imp: 901, clk: 1, pos: 10.6, entity: 'county' },
  { path: '/texas/travis-county-property-tax', imp: 610, clk: 0, pos: 11.3, entity: 'county' },
  // NJ state-level page (biggest impression magnet)
  { path: '/new-jersey/property-tax-rates', imp: 8508, clk: 8, pos: 13.0, entity: 'state' },
  // NJ top town opportunities
  { path: '/new-jersey/passaic/wayne-property-tax', imp: 791, clk: 9, pos: 8.3, entity: 'town' },
  { path: '/new-jersey/middlesex/piscataway-property-tax', imp: 771, clk: 3, pos: 9.7, entity: 'town' },
  { path: '/new-jersey/bergen/ridgewood-property-tax', imp: 677, clk: 2, pos: 8.4, entity: 'town' },
  { path: '/new-jersey/cape-may/avalon-property-tax', imp: 557, clk: 0, pos: 8.8, entity: 'town' },
  { path: '/new-jersey/camden/cherry-hill-property-tax', imp: 487, clk: 0, pos: 8.6, entity: 'town' },
  { path: '/new-jersey/essex/newark-property-tax', imp: 485, clk: 6, pos: 11.1, entity: 'town' },
  // NJ county-level
  { path: '/new-jersey/middlesex-county-property-tax', imp: 1053, clk: 0, pos: 6.6, entity: 'county' },
]

function parseTownPath(path: string): { stateSlug: string; countySlug: string; townSegment: string } | null {
  // Format: /{state}/{county}/{town-property-tax} or /{state}/{county}/{town}
  const segs = path.split('/').filter(Boolean)
  if (segs.length !== 3) return null
  return { stateSlug: segs[0], countySlug: segs[1], townSegment: segs[2] }
}

function dumpTownMeta(path: string) {
  const parsed = parseTownPath(path)
  if (!parsed) return null
  const result = getTownBySlugs(parsed.stateSlug, parsed.countySlug, parsed.townSegment)
  if (!result) return { error: `Town not found for ${path}` }
  const { county, town } = result
  const stateData = getStateData(parsed.stateSlug)!
  const overview = resolveTownPageOverview(town, county, stateData)
  const seo = buildTownSeoFields({ town, county, stateData, overview })
  return {
    tier: seo.tier,
    year: seo.year,
    title: seo.title,
    description: seo.description,
    titleLen: seo.title.length,
    descLen: seo.description.length,
  }
}

console.log('\n=== Current SEO metadata for high-priority dashboard URLs ===\n')

for (const t of TARGETS) {
  const ctr = t.imp > 0 ? ((t.clk / t.imp) * 100).toFixed(2) : 'n/a'
  console.log(`\n--- ${t.path}`)
  console.log(`    impressions=${t.imp}  clicks=${t.clk}  ctr=${ctr}%  position=${t.pos}`)

  if (t.entity === 'town') {
    const r = dumpTownMeta(t.path)
    if (!r) {
      console.log('    [town path could not be parsed]')
      continue
    }
    if ('error' in r) {
      console.log('    [error]', r.error)
      continue
    }
    console.log(`    tier   : ${r.tier}`)
    console.log(`    title  (${r.titleLen}): ${r.title}`)
    console.log(`    desc   (${r.descLen}): ${r.description}`)
  } else {
    // County and state-level pages are inlined — we'd need to grep their generateMetadata.
    // Leave as a marker; the title patterns are well-known from the GA4 export
    // (already shown in conversation) and don't need to be re-derived from data.
    console.log('    [county/state — manual title from GA4: see conversation]')
  }
}

console.log('\n')
