/* eslint-disable no-console */
/**
 * Validate sitemap generation: no duplicate locs, state overview URL present,
 * town URLs match publish-readiness indexable towns. Run with: npx tsx scripts/validate-sitemap.ts
 */

import { slugifyLocation } from '@/utils/locationUtils'
import { getTownSlug } from '@/lib/links/towns'
import {
  getBaseUrl,
  getStaticPageUrls,
  getStateUrls,
  listStateSlugs,
  loadStateData,
} from '../lib/sitemaps'
import { isTownIndexable } from '../lib/sitemap/isTownIndexable'

async function main() {
  const baseUrl = getBaseUrl()
  const allLocs: string[] = []
  const locSet = new Set<string>()
  const duplicates: string[] = []

  const staticUrls = getStaticPageUrls(baseUrl)
  for (const u of staticUrls) {
    allLocs.push(u.loc)
    if (locSet.has(u.loc)) duplicates.push(u.loc)
    else locSet.add(u.loc)
  }

  const stateSlugs = listStateSlugs()
  const missingStateOverview: string[] = []
  let townUrlCount = 0
  let indexableTownCount = 0

  for (const stateSlug of stateSlugs) {
    const stateUrls = await getStateUrls(baseUrl, stateSlug)
    const stateOverviewLoc = `${baseUrl.replace(/\/$/, '')}/${stateSlug}`

    let stateOverviewFound = false
    for (const u of stateUrls) {
      allLocs.push(u.loc)
      if (locSet.has(u.loc)) duplicates.push(u.loc)
      else locSet.add(u.loc)
      if (u.loc === stateOverviewLoc) stateOverviewFound = true
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
        const countySlugShort = county.slug || slugifyLocation(county.name)
        for (const town of county.towns ?? []) {
          const townSlug = getTownSlug(town)
          if (!townSlug) continue
          if (await isTownIndexable({ stateSlug, countySlug: countySlugShort, townSlug, town })) {
            indexableTownCount++
          }
        }
      }
    }
  }

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

  if (townUrlCount !== indexableTownCount) {
    console.error(
      `[FAIL] Town URLs in sitemap (${townUrlCount}) !== indexable towns (${indexableTownCount}).`
    )
    failed = true
  } else {
    console.log(
      `[OK] Town URLs (${townUrlCount}) match publish-readiness indexable count (${indexableTownCount}).`
    )
  }

  console.log(`Total unique URLs: ${locSet.size}`)
  if (failed) process.exit(1)
  console.log('Sitemap validation passed.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
