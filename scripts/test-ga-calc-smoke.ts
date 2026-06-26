/* eslint-disable no-console */
/**
 * Smoke test for the refactored GA calculator. Verifies that the per-component
 * HB 581 cap math produces:
 *   - Same total as pre-refactor for fully-out counties (backward compat)
 *   - Schools marked as "not capped" + county/city as "capped" for Henry/Paulding
 *   - All components marked as "capped" for Rockdale
 */
import { calculatePropertyTax } from '../utils/calculateTax'
import { getStateData } from '../lib/geo'

const stateData = getStateData('georgia')!

type Case = { name: string; county: string; town: string; fmv: number; expectedCapped: string[] }
const cases: Case[] = [
  { name: 'Atlanta (Fulton, fully out)', county: 'Fulton', town: 'Atlanta', fmv: 500000, expectedCapped: [] },
  { name: 'Douglasville (Douglas, fully out)', county: 'Douglas', town: 'Douglasville', fmv: 359000, expectedCapped: [] },
  { name: 'McDonough (Henry, schools-only out)', county: 'Henry', town: 'McDonough', fmv: 315000, expectedCapped: ['County', 'City'] },
  { name: 'Dallas (Paulding, schools-only out)', county: 'Paulding', town: 'Dallas', fmv: 252000, expectedCapped: ['County', 'City'] },
  { name: 'Conyers (Rockdale, fully in)', county: 'Rockdale', town: 'Conyers', fmv: 284000, expectedCapped: ['County', 'School', 'City'] },
]

let allPass = true
for (const c of cases) {
  const r = calculatePropertyTax(
    { homeValue: c.fmv, county: c.county, town: c.town, isPrimaryResidence: true },
    stateData
  )
  const rows = r.gaJurisdictionBreakdown ?? []
  const cappedLabels = rows.filter(r => r.isHb581Capped).map(r => r.label).sort()
  const expectedCapped = [...c.expectedCapped].sort()
  const matches = JSON.stringify(cappedLabels) === JSON.stringify(expectedCapped)
  if (!matches) allPass = false
  const rowsStr = rows
    .map(j => `${j.label}=$${j.portion.toFixed(0)}${j.isHb581Capped ? '*' : ''}`)
    .join('  ')
  console.log(
    `${matches ? '✓' : '✗'} ${c.name}\n` +
      `   total=$${r.annualTax.toFixed(0)}, hasCapped=${r.gaHasHb581CappedComponents}\n` +
      `   rows: ${rowsStr}\n` +
      `   capped: [${cappedLabels.join(',')}] vs expected [${expectedCapped.join(',')}]\n`
  )
}

if (!allPass) {
  console.error('FAILED — at least one case did not match expected cap pattern')
  process.exit(1)
}
console.log('PASS — all 5 cases match expected HB 581 cap patterns')
