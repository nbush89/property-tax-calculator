/**
 * County content builder assertions. Run all tests: npm test
 */
import assert from 'node:assert/strict'
import { getStateData, getCountyBySlug } from '@/lib/geo'
import {
  resolveCountyPageContent,
  collectCountyLatestValues,
  buildCountyTownInsights,
} from '@/lib/content/countyContent'

const nj = getStateData('new-jersey')
const tx = getStateData('texas')
assert.ok(nj, 'NJ state data')
assert.ok(tx, 'TX state data')

const bergen = getCountyBySlug(nj!, 'bergen')
const harris = getCountyBySlug(tx!, 'harris')
assert.ok(bergen, 'bergen')
assert.ok(harris, 'harris')

const njContent = resolveCountyPageContent({
  stateSlug: 'new-jersey',
  stateData: nj!,
  county: bergen!,
})
assert.ok(njContent.content.overview.paragraphs.length >= 2)
assert.ok(njContent.content.taxFactors.bullets.length >= 3)
assert.ok(njContent.content.estimateGuide.steps.length === 3)

const txContent = resolveCountyPageContent({ stateSlug: 'texas', stateData: tx!, county: harris! })
assert.ok(txContent.content.overview.paragraphs.length >= 1)
// TX uses Comptroller-style factors bullet when capability says so
assert.ok(txContent.content.taxFactors.bullets.some(b => b.toLowerCase().includes('taxing unit')))

const bills = collectCountyLatestValues(nj!.counties, 'averageResidentialTaxBill')
assert.ok(bills.length > 10, 'NJ should have many county bills')

const txRates = collectCountyLatestValues(tx!.counties, 'effectiveTaxRate')
assert.equal(txRates.length, 6)

const townHl = buildCountyTownInsights({ stateSlug: 'texas', county: harris! })
assert.ok(townHl, 'harris town insights')
assert.ok(townHl!.highlights.length >= 1)

console.log('[OK] countyContent tests passed')
