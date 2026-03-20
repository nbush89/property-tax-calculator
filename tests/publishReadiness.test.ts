/**
 * Publish readiness validators — NJ + Texas smoke checks.
 * Run: npm test
 */
import assert from 'node:assert/strict'
import {
  validateTownPublishReadiness,
  validateCountyPublishReadiness,
  validateStatePublishReadiness,
  resolveTownPrimaryMetricForPublish,
} from '@/lib/publishReadiness'
import { getStateData, getTownBySlugs } from '@/lib/geo'

import { resolveTownPageOverview } from '@/lib/town-overview/resolve-page-overview'

const nj = getStateData('new-jersey')
const tx = getStateData('texas')
assert.ok(nj && tx)

const ridgewood = getTownBySlugs('new-jersey', 'bergen', 'ridgewood')
const houston = getTownBySlugs('texas', 'harris', 'houston')
assert.ok(ridgewood && houston)

const njTown = validateTownPublishReadiness({
  stateSlug: 'new-jersey',
  countySlug: 'bergen',
  townSlug: 'ridgewood',
})
assert.equal(njTown.decision, 'publish')
assert.ok(njTown.metrics.primaryMetricResolved)

const txTown = validateTownPublishReadiness({
  stateSlug: 'texas',
  countySlug: 'harris',
  townSlug: 'houston',
})
assert.equal(txTown.decision, 'publish')
assert.equal(txTown.metrics.primaryMetricKey, 'effectiveTaxRate')

const ovH = resolveTownPageOverview(houston!.town, houston!.county, tx!)
const primTx = resolveTownPrimaryMetricForPublish('texas', houston!.town, houston!.county, ovH)
assert.ok(primTx?.metricKey === 'effectiveTaxRate')

const badTown = validateTownPublishReadiness({
  stateSlug: 'texas',
  countySlug: 'harris',
  townSlug: '__no_such_town__',
})
assert.equal(badTown.decision, 'hold')
assert.ok(badTown.issues.some(i => i.code === 'TOWN_NOT_RESOLVED'))

const harrisCounty = validateCountyPublishReadiness({
  stateSlug: 'texas',
  countySlug: 'harris',
})
assert.equal(harrisCounty.decision, 'publish')

const njCounty = validateCountyPublishReadiness({
  stateSlug: 'new-jersey',
  countySlug: 'atlantic',
})
assert.equal(njCounty.decision, 'publish')

const njState = validateStatePublishReadiness({ stateSlug: 'new-jersey' })
assert.equal(njState.decision, 'publish')

const txState = validateStatePublishReadiness({ stateSlug: 'texas' })
assert.equal(txState.decision, 'publish')

console.log('[OK] publishReadiness tests passed')
