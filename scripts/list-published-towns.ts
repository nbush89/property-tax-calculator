/* eslint-disable no-console */
/**
 * List NJ towns that are published (included in sitemap: have metrics or isLive).
 * Run: npx tsx scripts/list-published-towns.ts
 */

import { getStateData } from '@/lib/geo'
import { isTownPublished } from '@/lib/sitemaps'

function main() {
  const stateData = getStateData('new-jersey')
  if (!stateData) {
    console.error('State data not found')
    process.exit(1)
  }

  const published: { county: string; town: string; slug: string }[] = []
  for (const county of stateData.counties ?? []) {
    for (const town of county.towns ?? []) {
      if (isTownPublished(town)) {
        published.push({
          county: county.name,
          town: town.name,
          slug:
            town.slug ??
            String((town as { name?: string }).name ?? '')
              .toLowerCase()
              .replace(/\s+/g, '-'),
        })
      }
    }
  }

  console.log('Published NJ towns (included in sitemap):')
  console.log('Count:', published.length)
  console.log('')
  for (const { county, town, slug } of published) {
    console.log(`  ${county} County: ${town} (${slug})`)
  }
}

main()
