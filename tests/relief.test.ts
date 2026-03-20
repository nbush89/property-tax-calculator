/**
 * State relief config + calculator integration. Run all tests: npm test
 */
import assert from 'node:assert/strict'
import { calculatePropertyTax } from '@/utils/calculateTax'
import { normalizeStateData } from '@/lib/data/adapter'

const txRaw = {
  state: { name: 'Texas', slug: 'texas', abbreviation: 'TX', asOfYear: 2024 },
  sources: {},
  counties: [
    {
      name: 'Test',
      slug: 'test',
      towns: [{ name: 'TownA', avgRate: 0.02 }],
    },
  ],
}

const njRaw = {
  state: { name: 'New Jersey', slug: 'new-jersey', abbreviation: 'NJ', asOfYear: 2024 },
  sources: {
    src: {
      publisher: 'Test',
      title: 'Rates',
      type: 'pdf',
      homepageUrl: 'https://example.com',
    },
  },
  counties: [
    {
      name: 'Bergen',
      slug: 'bergen',
      metrics: {
        effectiveTaxRate: [
          { year: 2024, value: 2.0, unit: 'PERCENT' as const, sourceRef: 'src' },
        ],
      },
      towns: [],
    },
  ],
}

const txData = normalizeStateData(txRaw as any)
const njData = normalizeStateData(njRaw as any)

const txBase = calculatePropertyTax({ homeValue: 400_000, county: 'Test', town: 'TownA' }, txData)
assert.equal(txBase.taxableValueUsed, 400_000)
assert.equal(txBase.annualTax, 8000)
assert.equal(txBase.relief, undefined)

const txHomestead = calculatePropertyTax(
  {
    homeValue: 400_000,
    county: 'Test',
    town: 'TownA',
    reliefSelections: { tx_homestead_residence: true },
  },
  txData
)
assert.equal(txHomestead.taxableValueUsed, 300_000)
assert.equal(txHomestead.annualTax, 6000)
assert.equal(txHomestead.baseAnnualTaxBeforeRelief, 8000)
assert.ok(txHomestead.relief?.appliedPrograms.some(p => p.programId === 'tx_homestead_residence'))

const txSmall = calculatePropertyTax(
  {
    homeValue: 50_000,
    county: 'Test',
    town: 'TownA',
    reliefSelections: { tx_homestead_residence: true },
  },
  txData
)
assert.equal(txSmall.taxableValueUsed, 0)
assert.equal(txSmall.annualTax, 0)

const txInfoOnly = calculatePropertyTax(
  {
    homeValue: 400_000,
    county: 'Test',
    town: 'TownA',
    reliefSelections: { tx_over_65_school_freeze: true },
  },
  txData
)
assert.equal(txInfoOnly.taxableValueUsed, 400_000)
assert.equal(txInfoOnly.annualTax, 8000)
assert.equal(txInfoOnly.relief, undefined)

const njBase = calculatePropertyTax({ homeValue: 400_000, county: 'Bergen' }, njData)
assert.equal(njBase.annualTax, 8000)

const njVet = calculatePropertyTax(
  {
    homeValue: 400_000,
    county: 'Bergen',
    reliefSelections: { nj_credit_veteran: true },
  },
  njData
)
assert.equal(njVet.annualTax, 2000)
assert.equal(njVet.exemptions, 6000)

const njAnchor = calculatePropertyTax(
  {
    homeValue: 400_000,
    county: 'Bergen',
    reliefSelections: { nj_anchor: true },
  },
  njData
)
assert.equal(njAnchor.annualTax, njBase.annualTax)

console.log('[OK] relief tests passed')
