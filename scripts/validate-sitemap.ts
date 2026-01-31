/* eslint-disable no-console */
/**
 * Validate sitemap generation: no duplicate locs, state overview URL present,
 * unpublished towns excluded. Run with: npx tsx scripts/validate-sitemap.ts
 */

import {
  getBaseUrl,
  getStaticPageUrls,
  getStateUrls,
  listStateSlugs,
  isTownPublished,
  loadStateData,
} from '../lib/sitemaps'

function main() {
  const baseUrl = getBaseUrl()
  const allLocs: string[] = []
  const locSet = new Set<string>()
  const duplicates: string[] = []

  // Static URLs
  const staticUrls = getStaticPageUrls(baseUrl)
  for (const u of staticUrls) {
    allLocs.push(u.loc)
    if (locSet.has(u.loc)) duplicates.push(u.loc)
    else locSet.add(u.loc)
  }

  // State URLs (no state-specific routes in static – avoid duplicates)
  const stateSlugs = listStateSlugs()
  const missingStateOverview: string[] = []
  let townUrlCount = 0
  let publishedTownCount = 0

  for (const stateSlug of stateSlugs) {
    const stateUrls = getStateUrls(baseUrl, stateSlug)
    const stateOverviewLoc = `${baseUrl.replace(/\/$/, '')}/${stateSlug}`

    let stateOverviewFound = false
    for (const u of stateUrls) {
      allLocs.push(u.loc)
      if (locSet.has(u.loc)) duplicates.push(u.loc)
      else locSet.add(u.loc)
      if (u.loc === stateOverviewLoc) stateOverviewFound = true
      // Town pages: /base/state/county/town-property-tax (3 path segments, last ends with -property-tax)
      const pathSegments = u.loc.replace(baseUrl.replace(/\/$/, ''), '').split('/').filter(Boolean)
      if (pathSegments.length === 3 && pathSegments[2].endsWith('-property-tax')) {
        townUrlCount++
      }
    }

    if (!stateOverviewFound) {
      missingStateOverview.push(stateSlug)
    }

    const stateData = loadStateData(stateSlug)
    if (stateData) {
      for (const county of stateData.counties ?? []) {
        for (const town of county.towns ?? []) {
          if (isTownPublished(town)) publishedTownCount++
        }
      }
    }
  }

  // Report
  let failed = false
  if (duplicates.length > 0) {
    console.error(
      `[FAIL] Duplicate loc values (${duplicates.length}):`,
      [...new Set(duplicates)].slice(0, 10)
    )
    failed = true
  } else {
    console.log('[OK] No duplicate loc values across static + state URLs.')
  }

  if (missingStateOverview.length > 0) {
    console.error(`[FAIL] State overview URL missing for: ${missingStateOverview.join(', ')}`)
    failed = true
  } else {
    console.log('[OK] State overview URL (e.g. /new-jersey) present for each state.')
  }

  if (townUrlCount > publishedTownCount) {
    console.error(
      `[FAIL] Town URLs (${townUrlCount}) exceed published towns (${publishedTownCount}).`
    )
    failed = true
  } else {
    console.log(
      `[OK] Town URLs (${townUrlCount}) <= published towns (${publishedTownCount}). Unpublished towns excluded.`
    )
  }

  console.log(`Total unique URLs: ${locSet.size}`)
  if (failed) process.exit(1)
  console.log('Sitemap validation passed.')
}

main()
