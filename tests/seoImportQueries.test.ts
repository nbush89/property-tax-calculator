/**
 * Search Console Queries CSV — multi-page column vs single-page override
 */
import assert from 'node:assert/strict'
import { parseSearchConsoleQueriesCsv } from '@/lib/seo/importSearchConsoleQueries'
import { aggregateQueryPerformance } from '@/lib/seo/aggregateQueryPerformance'
import { buildSeoRecommendationRowsFromCsv } from '@/lib/seo/buildSeoRecommendationRows'

const csvWithPage = `Query,Page,Clicks,Impressions,CTR,Position
ridgewood property tax calculator,https://www.home-property-tax.com/new-jersey/bergen-county-property-tax/ridgewood-property-tax,5,200,2.5%,8
ridgewood tax rate,/new-jersey/bergen-county-property-tax/ridgewood-property-tax,2,150,1.33%,9
noise,,1,10,1%,5
`

const csvNoPage = `Query,Clicks,Impressions,CTR,Position
ridgewood property tax calculator,5,200,2.5%,8
ridgewood tax rate,2,150,1.33%,9
`

const ridgewoodPath = '/new-jersey/bergen-county-property-tax/ridgewood-property-tax'

function run(): void {
  const { rows, summary } = parseSearchConsoleQueriesCsv(csvWithPage)
  assert.equal(summary.totalRows, 3)
  assert.equal(summary.validRows, 2)
  assert.equal(summary.invalidRows, 1)
  assert.equal(summary.usedPageOverride, false)
  assert.equal(summary.ignoredPagePathOverride, undefined)
  assert.equal(summary.matchedRows, 2)
  assert.equal(summary.unmatchedRows, 0)
  assert.equal(rows.length, 2)
  assert.equal(rows[0]!.query.includes('ridgewood'), true)

  const withIgnored = parseSearchConsoleQueriesCsv(csvWithPage, {
    pagePathOverride: 'https://example.com/new-jersey/bergen-county-property-tax',
  })
  assert.equal(withIgnored.summary.ignoredPagePathOverride, true)
  assert.equal(withIgnored.rows[0]!.pagePath, ridgewoodPath)

  const { aggregates, unmatchedPagePaths } = aggregateQueryPerformance(rows)
  assert.equal(unmatchedPagePaths.length, 0)
  assert.equal(aggregates.length, 1)
  const agg = aggregates[0]!
  assert.equal(agg.clicks, 7)
  assert.equal(agg.impressions, 350)
  assert.ok(agg.ctr > 0 && agg.ctr < 1)
  assert.ok(agg.avgPosition > 8 && agg.avgPosition < 9)
  assert.equal(agg.topQueries[0]!.impressions >= agg.topQueries[1]!.impressions, true)

  const built = buildSeoRecommendationRowsFromCsv(csvWithPage, {})
  assert.ok(built.rows.length >= 1)
  const row = built.rows.find(r => r.pagePath.includes('ridgewood'))
  assert.ok(row)
  assert.ok(row!.suggestedTitle.length > 0)
  assert.ok(row!.rationale.length > 0)
  assert.equal(built.importSummary.matchedRows, 2)

  // Single-page export: no page column, override required
  assert.throws(
    () => parseSearchConsoleQueriesCsv(csvNoPage),
    /does not include a page column/i,
  )

  const single = parseSearchConsoleQueriesCsv(csvNoPage, {
    pagePathOverride: `https://www.home-property-tax.com${ridgewoodPath}`,
  })
  assert.equal(single.rows.length, 2)
  assert.equal(single.summary.usedPageOverride, true)
  assert.equal(single.summary.pageOverride, ridgewoodPath)
  assert.equal(single.rows.every(r => r.pagePath === ridgewoodPath), true)
  assert.equal(single.summary.matchedRows, 2)

  const singleRel = parseSearchConsoleQueriesCsv(csvNoPage, {
    pagePathOverride: ridgewoodPath,
  })
  assert.equal(singleRel.rows[0]!.pagePath, ridgewoodPath)

  assert.throws(
    () =>
      parseSearchConsoleQueriesCsv(csvNoPage, {
        pagePathOverride: '/about',
      }),
    /could not be matched/i,
  )

  assert.throws(
    () => parseSearchConsoleQueriesCsv('not,enough\ncols', { pagePathOverride: ridgewoodPath }),
    /Missing required column/i,
  )

  const allBad = `Query,Clicks,Impressions,CTR,Position\n,,1,1,1%\n`
  assert.throws(() => parseSearchConsoleQueriesCsv(allBad, { pagePathOverride: ridgewoodPath }), /No valid rows/i)

  const end = buildSeoRecommendationRowsFromCsv(csvNoPage, {}, { pagePathOverride: ridgewoodPath })
  assert.ok(end.rows.length >= 1)

  console.log('[OK] seoImportQueries tests passed')
}

run()
