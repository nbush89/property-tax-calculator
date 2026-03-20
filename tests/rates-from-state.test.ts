/**
 * Rates/year helpers. Run all tests: npm test
 */
import assert from 'node:assert/strict'
import { normalizeStateData } from '@/lib/data/adapter'
import { getTownEffectiveTaxRateYear } from '@/lib/rates-from-state'

const rawMinimal = {
  state: {
    name: 'New Jersey',
    slug: 'new-jersey',
    abbreviation: 'NJ',
    asOfYear: 2024,
  },
  sources: {},
  counties: [
    {
      name: 'Bergen',
      slug: 'bergen',
      towns: [
        {
          name: 'Fort Lee',
          avgRate: 0.0036,
          overview: {
            asOfYear: 2024,
            effectiveTaxRateYear: 2025,
            sources: [{ name: 'x', url: 'y', retrieved: '2026-03-18' }],
          },
        },
      ],
    },
  ],
}

const normalized = normalizeStateData(rawMinimal as any)
const year = getTownEffectiveTaxRateYear(normalized, 'Bergen', 'Fort Lee')

assert.equal(
  year,
  2025,
  'municipal avgRate row should use overview.effectiveTaxRateYear, not calendar year from retrieved date'
)

console.log('[OK] rates-from-state tests passed')
