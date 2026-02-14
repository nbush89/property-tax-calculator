/* eslint-disable no-console */
/**
 * List NJ towns that are unpublished (excluded from sitemap: no metrics or isLive not set).
 * Run: npx tsx scripts/list-unpublished-towns.ts
 */

import { getStateData } from '@/lib/geo'
import { isTownPublished } from '@/lib/sitemaps'

function main() {
  const stateData = getStateData('new-jersey')
  if (!stateData) {
    console.error('State data not found')
    process.exit(1)
  }

  const unpublished: { county: string; town: string; slug: string }[] = []
  for (const county of stateData.counties ?? []) {
    for (const town of county.towns ?? []) {
      if (!isTownPublished(town)) {
        unpublished.push({
          county: county.name,
          town: town.name,
          slug: town.slug ?? String((town as { name?: string }).name ?? '').toLowerCase().replace(/\s+/g, '-'),
        })
      }
    }
  }

  console.log('Unpublished NJ towns (excluded from sitemap):')
  console.log('Count:', unpublished.length)
  console.log('')
  for (const { county, town, slug } of unpublished) {
    console.log(`  ${county} County: ${town} (${slug})`)
  }
}

main()
