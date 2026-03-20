/**
 * SEO path → entity mapping
 */
import assert from 'node:assert/strict'
import { normalizeSitePath, pathToEntity } from '@/lib/seo/pathToEntity'

function run(): void {
  assert.equal(normalizeSitePath('https://www.home-property-tax.com/new-jersey/bergen-county-property-tax'), '/new-jersey/bergen-county-property-tax')
  assert.equal(normalizeSitePath('/Texas/Harris-County-Property-Tax/Towns'), '/texas/harris-county-property-tax/towns')

  const county = pathToEntity('/new-jersey/atlantic-county-property-tax')
  assert.equal(county.matched && county.entityType === 'county' && county.stateSlug === 'new-jersey', true)

  const town = pathToEntity('/new-jersey/bergen-county-property-tax/ridgewood-property-tax')
  assert.equal(town.matched && town.entityType === 'town', true)
  if (town.matched && town.entityType === 'town') {
    assert.equal(town.townSlug, 'ridgewood')
    assert.equal(town.countySlug, 'bergen')
  }

  const st = pathToEntity('/texas/property-tax-calculator')
  assert.equal(st.matched && st.entityType === 'state', true)

  const bad = pathToEntity('/about')
  assert.equal(bad.matched, false)

  console.log('[OK] seoPathToEntity tests passed')
}

run()
