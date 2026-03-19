/**
 * Lightweight assertions for display resolver (run: npx tsx lib/metrics/resolveDisplayMetrics.test.ts)
 */
import assert from 'node:assert/strict'
import type { MetricSeries } from '@/lib/data/types'
import {
  resolveDisplayMetrics,
  hasUsableMetricValue,
  getCountyHeroHighlight,
  canCompareMetricAcrossStates,
} from './resolveDisplayMetrics'
import { getMetricAvailability } from './stateMetricCapabilities'
import { isMetricDisplayAllowed } from './stateMetricCapabilities'

const billSeries: MetricSeries = [
  { year: 2023, value: 9000, unit: 'USD', sourceRef: 't' },
  { year: 2024, value: 9200, unit: 'USD', sourceRef: 't' },
]

const rateSeries: MetricSeries = [
  { year: 2024, value: 2.1, unit: 'PERCENT', sourceRef: 't' },
]

// —— hasUsableMetricValue
assert.equal(hasUsableMetricValue(undefined), false)
assert.equal(hasUsableMetricValue([]), false)
assert.equal(hasUsableMetricValue(billSeries), true)

// —— NJ county: bill + rate supported → hero prefers bill (lower priority number)
const njCounty = resolveDisplayMetrics({
  stateSlug: 'new-jersey',
  geographyLevel: 'county',
  metrics: { averageResidentialTaxBill: billSeries, effectiveTaxRate: rateSeries },
})
const njBill = njCounty.find(m => m.key === 'averageResidentialTaxBill')
const njRate = njCounty.find(m => m.key === 'effectiveTaxRate')
assert.ok(njBill?.show)
assert.ok(njRate?.show)
const heroNj = getCountyHeroHighlight('new-jersey', {
  averageResidentialTaxBill: billSeries,
  effectiveTaxRate: rateSeries,
})
assert.equal(heroNj?.key, 'averageResidentialTaxBill')

// —— TX county: bill unsupported → only rate in resolution
const txCounty = resolveDisplayMetrics({
  stateSlug: 'texas',
  geographyLevel: 'county',
  metrics: { averageResidentialTaxBill: billSeries, effectiveTaxRate: rateSeries },
})
assert.ok(!txCounty.some(m => m.key === 'averageResidentialTaxBill'))
assert.ok(txCounty.some(m => m.key === 'effectiveTaxRate'))

const heroTx = getCountyHeroHighlight('texas', {
  averageResidentialTaxBill: billSeries,
  effectiveTaxRate: rateSeries,
})
assert.equal(heroTx?.key, 'effectiveTaxRate')

// —— TX town: rate present, bill unsupported
const txTown = resolveDisplayMetrics({
  stateSlug: 'texas',
  geographyLevel: 'town',
  metrics: { effectiveTaxRate: rateSeries, averageResidentialTaxBill: billSeries },
})
assert.ok(!txTown.some(m => m.key === 'averageResidentialTaxBill'))
assert.ok(txTown.some(m => m.key === 'effectiveTaxRate'))

// —— Explicit unsupported does not show even with data
const avTxBill = getMetricAvailability('texas', 'county', 'averageResidentialTaxBill')
assert.equal(avTxBill?.supported, false)
assert.equal(isMetricDisplayAllowed('texas', 'town', 'averageResidentialTaxBill'), false)

// —— Cross-state comparison guard
assert.equal(
  canCompareMetricAcrossStates('averageResidentialTaxBill', 'new-jersey', 'texas'),
  false
)
assert.equal(canCompareMetricAcrossStates('medianHomeValue', 'texas', 'new-jersey'), false)

console.log('[OK] resolveDisplayMetrics tests passed')
