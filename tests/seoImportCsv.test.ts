/**
 * Search Console CSV parsing
 */
import assert from 'node:assert/strict'
import { parseSearchConsoleLandingPageCsv } from '@/lib/seo/importSearchConsoleCsv'

const csv = `Top pages,Clicks,Impressions,CTR,Position
https://www.home-property-tax.com/new-jersey/bergen-county-property-tax,10,500,2%,8.5
https://example.com/about,1,100,1%,10
/new-jersey/not-a-real-county-xyz/foo,1,100,1%,10
`

function run(): void {
  const { rows, summary } = parseSearchConsoleLandingPageCsv(csv)
  assert.equal(summary.invalid, 0)
  assert.equal(summary.unmatched >= 2, true)
  assert.equal(rows.length, 1)
  assert.equal(rows[0]!.pagePath, '/new-jersey/bergen-county-property-tax')
  assert.equal(rows[0]!.ctr, 0.02)
  assert.ok(Math.abs(rows[0]!.averagePosition - 8.5) < 0.01)

  const dup = `Top pages,Clicks,Impressions,CTR,Position
/new-jersey/bergen-county-property-tax,1,100,1%,10
/new-jersey/bergen-county-property-tax,5,200,2.5%,9
`
  const r2 = parseSearchConsoleLandingPageCsv(dup)
  assert.equal(r2.rows.length, 1)
  assert.equal(r2.rows[0]!.clicks, 5)

  console.log('[OK] seoImportCsv tests passed')
}

run()
