/**
 * Town overview enrichment: headline metrics from series when JSON overview is sparse.
 * Run all tests: npm test
 */
import assert from 'node:assert/strict'
import { getStateData, getTownBySlugs } from '@/lib/geo'
import { enrichOverviewYearsFromMetrics } from '@/lib/town-overview/derive'

const tx = getStateData('texas')
assert.ok(tx, 'TX state data')
const houston = getTownBySlugs('texas', 'harris', 'houston')
assert.ok(houston, 'Houston town')
const { town: houstonTown, county: harrisCounty } = houston!

// Texas town with rate series but no JSON overview block should still get a headline rate
const txOnlyAsOf = enrichOverviewYearsFromMetrics(
  houstonTown,
  harrisCounty,
  { asOfYear: 2024 },
  tx
)
assert.ok(
  txOnlyAsOf.effectiveTaxRatePct != null && txOnlyAsOf.effectiveTaxRatePct > 0,
  'sparse overview: town effective rate from metrics'
)

const murphy = getTownBySlugs('texas', 'collin', 'murphy')
assert.ok(murphy, 'Murphy town')
const { town: murphyTown, county: collinCounty } = murphy!
const txMurphy = enrichOverviewYearsFromMetrics(murphyTown, collinCounty, { asOfYear: 2025 }, tx)
assert.ok(
  txMurphy.avgResidentialTaxBill != null && txMurphy.avgResidentialTaxBill > 0,
  'TX medianTaxesPaid maps into headline tax-bill slot'
)
assert.ok(
  txMurphy.avgResidentialTaxBillYear != null && txMurphy.avgResidentialTaxBillYear >= 2020,
  'TX medianTaxesPaid year is carried into avgResidentialTaxBillYear'
)

const nj = getStateData('new-jersey')
assert.ok(nj, 'NJ state data')
const ridgewood = getTownBySlugs('new-jersey', 'bergen', 'ridgewood')
assert.ok(ridgewood, 'Ridgewood')
const { town: rwTown, county: bergenCounty } = ridgewood!

const njEnriched = enrichOverviewYearsFromMetrics(rwTown, bergenCounty, { asOfYear: 2024 }, nj)
assert.ok(
  njEnriched.avgResidentialTaxBill != null || njEnriched.effectiveTaxRatePct != null,
  'NJ town: at least one headline metric after enrich'
)

console.log('[OK] enrich-town-overview tests passed')
