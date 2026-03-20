/**
 * Sitemap town gating via publish readiness + effective status.
 * Run: npm test (via tests/run-all.ts) or npx tsx tests/sitemapTownIndexable.test.ts
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugifyLocation } from '@/utils/locationUtils'
import { getTownSlug } from '@/lib/links/towns'
import { getStateData, getTownBySlugs } from '@/lib/geo'
import { isTownIndexable } from '@/lib/sitemap/isTownIndexable'
import { getStateUrls } from '@/lib/sitemaps'
import { resolveEffectivePublishStatus, isEffectivelyPublished } from '@/lib/publishReadiness/effectivePublishStatus'
import type { TownData } from '@/lib/data/types'

export async function runSitemapTownIndexableTests(): Promise<void> {
  const baseUrl = 'https://example.com'

  const ridgewood = getTownBySlugs('new-jersey', 'bergen', 'ridgewood')
  assert.ok(ridgewood)
  const rOk = await isTownIndexable({
    stateSlug: 'new-jersey',
    countySlug: ridgewood!.county.slug,
    townSlug: getTownSlug(ridgewood!.town),
    town: ridgewood!.town,
  })
  assert.equal(rOk, true, 'NJ Ridgewood should be indexable when validator publishes')

  const houston = getTownBySlugs('texas', 'harris', 'houston')
  assert.ok(houston)
  const hOk = await isTownIndexable({
    stateSlug: 'texas',
    countySlug: houston!.county.slug,
    townSlug: getTownSlug(houston!.town),
    town: houston!.town,
  })
  assert.equal(hOk, true, 'TX Houston should be indexable')

  const ghostOk = await isTownIndexable({
    stateSlug: 'texas',
    countySlug: 'harris',
    townSlug: '__not_a_real_town_slug__',
    town: { name: 'Ghost', slug: '__not_a_real_town_slug__' } as TownData,
  })
  assert.equal(ghostOk, false)

  assert.equal(isEffectivelyPublished(resolveEffectivePublishStatus('hold', 'use_validator')), false)
  assert.equal(isEffectivelyPublished(resolveEffectivePublishStatus('publish', 'use_validator')), true)
  assert.equal(
    isEffectivelyPublished(resolveEffectivePublishStatus('publish_with_warnings', 'use_validator')),
    true
  )
  assert.equal(isEffectivelyPublished(resolveEffectivePublishStatus('publish', 'hold')), false)
  assert.equal(isEffectivelyPublished(resolveEffectivePublishStatus('hold', 'publish')), true)

  const nj = getStateData('new-jersey')
  assert.ok(nj)
  let indexableNj = 0
  for (const county of nj!.counties) {
    const cSlug = county.slug || slugifyLocation(county.name)
    for (const town of county.towns ?? []) {
      const ts = getTownSlug(town)
      if (!ts) continue
      if (await isTownIndexable({ stateSlug: 'new-jersey', countySlug: cSlug, townSlug: ts, town }))
        indexableNj++
    }
  }
  const njUrls = await getStateUrls(baseUrl, 'new-jersey')
  let townUrlsNj = 0
  for (const u of njUrls) {
    const segs = new URL(u.loc).pathname.split('/').filter(Boolean)
    if (segs.length === 3 && segs[2].endsWith('-property-tax')) townUrlsNj++
  }
  assert.equal(townUrlsNj, indexableNj, 'sitemap town URLs must match isTownIndexable count for NJ')

  console.log('[OK] sitemapTownIndexable tests passed')
}

// Allow direct execution: npx tsx tests/sitemapTownIndexable.test.ts
const isDirectRun =
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? '')
if (isDirectRun) {
  runSitemapTownIndexableTests().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
