/* eslint-disable no-console */
/**
 * Comprehensive calculator validation across every GA county + every HB 581
 * configuration we ship. Asserts:
 *   1. Sum of breakdown row portions equals annualTax (cash conservation)
 *   2. Cap flags on rendered rows match the source millage flags
 *   3. State portion is never marked as capped (state did not opt anything)
 *   4. No NaN, negative, or absent values
 *   5. isPrimaryResidence=false correctly suppresses the homestead exemption
 *   6. Fallback (no town) path uses county-level millage
 *   7. Backward compatibility — known fixed values for existing pages
 *
 * Run: npx tsx scripts/validate-ga-hb581-math.ts
 */
import { calculatePropertyTax } from '../utils/calculateTax'
import { getStateData } from '../lib/geo'

const sd = getStateData('georgia')!

type Pattern = 'fully-out' | 'schools-only-out' | 'fully-in' | 'county-and-schools-out' | 'mixed-other'

type Case = {
  county: string
  town: string
  fmv: number
  pattern: Pattern
  expectedCapped: Array<'County' | 'School' | 'City'>
  notes?: string
}

// One representative case per HB 581 configuration. Town picked = a Ready
// town in that county where copy exists.
const CASES: Case[] = [
  // === Pattern 1: Fully opted out (5 counties) ===
  { county: 'Fulton', town: 'Atlanta', fmv: 500000, pattern: 'fully-out', expectedCapped: [], notes: 'Has independent school district' },
  { county: 'Fulton', town: 'Sandy Springs', fmv: 700000, pattern: 'fully-out', expectedCapped: [] },
  { county: 'DeKalb', town: 'Decatur', fmv: 640000, pattern: 'fully-out', expectedCapped: [], notes: 'Has independent school district (City Schools of Decatur)' },
  { county: 'Gwinnett', town: 'Lawrenceville', fmv: 350000, pattern: 'fully-out', expectedCapped: [], notes: 'County has pre-existing local cap' },
  { county: 'Cobb', town: 'Marietta', fmv: 448500, pattern: 'fully-out', expectedCapped: [], notes: 'Independent school district + county has pre-existing local cap' },
  { county: 'Douglas', town: 'Douglasville', fmv: 359200, pattern: 'fully-out', expectedCapped: [] },

  // === Pattern 2: Schools-only opted out, county + city stayed in (7 counties) ===
  { county: 'Henry', town: 'McDonough', fmv: 315000, pattern: 'schools-only-out', expectedCapped: ['County', 'City'] },
  { county: 'Paulding', town: 'Dallas', fmv: 252000, pattern: 'schools-only-out', expectedCapped: ['County', 'City'] },
  { county: 'Cherokee', town: 'Canton', fmv: 407800, pattern: 'schools-only-out', expectedCapped: ['County', 'City'], notes: 'Pre-existing local cap on county' },
  { county: 'Forsyth', town: 'Cumming', fmv: 382900, pattern: 'schools-only-out', expectedCapped: ['County'], notes: 'Cumming has $0 city millage' },
  { county: 'Fayette', town: 'Fayetteville', fmv: 368200, pattern: 'schools-only-out', expectedCapped: ['County', 'City'], notes: 'School uses pre-existing HB 1166 cap' },
  { county: 'Coweta', town: 'Newnan', fmv: 364700, pattern: 'schools-only-out', expectedCapped: ['County', 'City'] },
  { county: 'Newton', town: 'Covington', fmv: 301900, pattern: 'schools-only-out', expectedCapped: ['County', 'City'] },

  // === Pattern 3: Fully opted in (1 county) ===
  { county: 'Rockdale', town: 'Conyers', fmv: 284000, pattern: 'fully-in', expectedCapped: ['County', 'School', 'City'] },

  // === Pattern 4: County + schools both out, city in (1 county) ===
  { county: 'Clayton', town: 'Jonesboro', fmv: 188300, pattern: 'county-and-schools-out', expectedCapped: ['City'] },

  // === Hiram has $0 city millage AND city stayed in → only County row should be capped
  { county: 'Paulding', town: 'Hiram', fmv: 303200, pattern: 'schools-only-out', expectedCapped: ['County'], notes: 'Hiram has $0 city millage' },
]

let failures = 0
const known: Array<{ name: string; pass: boolean; detail: string }> = []

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function checkCase(c: Case): void {
  const r = calculatePropertyTax(
    { homeValue: c.fmv, county: c.county, town: c.town, isPrimaryResidence: true },
    sd
  )
  const rows = r.gaJurisdictionBreakdown ?? []

  // 1. Sum of row portions === annualTax (within rounding)
  const sumRows = rows.reduce((s, row) => s + row.portion, 0)
  const cashOk = Math.abs(sumRows - r.annualTax) < 1

  // 2. Cap flags match expected
  const actualCapped = rows
    .filter(row => row.isHb581Capped)
    .map(row => row.label)
    .sort()
  const expCapped = [...c.expectedCapped].sort()
  const capOk = JSON.stringify(actualCapped) === JSON.stringify(expCapped)

  // 3. State portion never capped
  const stateRow = rows.find(row => row.label === 'State')
  const stateOk = !stateRow || !stateRow.isHb581Capped

  // 4. No NaN / negative / missing
  const valuesOk =
    Number.isFinite(r.annualTax) &&
    r.annualTax >= 0 &&
    rows.every(row => Number.isFinite(row.portion) && row.portion >= 0)

  // 5. hasCapped flag matches presence of capped rows
  const hasCappedOk = (rows.some(row => row.isHb581Capped)) === (r.gaHasHb581CappedComponents === true)

  const allOk = cashOk && capOk && stateOk && valuesOk && hasCappedOk
  if (!allOk) failures++

  const rowsStr = rows
    .map(row => `${row.label}=${fmt(row.portion)}${row.isHb581Capped ? '*' : ''}`)
    .join(' ')
  const checks = [
    cashOk ? 'cash✓' : `CASH✗(${fmt(sumRows)}≠${fmt(r.annualTax)})`,
    capOk ? 'cap✓' : `CAP✗(got [${actualCapped.join(',')}] vs exp [${expCapped.join(',')}])`,
    stateOk ? 'state✓' : 'STATE✗',
    valuesOk ? 'values✓' : 'VALUES✗',
    hasCappedOk ? 'flag✓' : 'FLAG✗',
  ].join(' ')

  console.log(
    `${allOk ? '✓' : '✗'} [${c.pattern}] ${c.county}/${c.town} fmv=${fmt(c.fmv)}`
  )
  console.log(`  total=${fmt(r.annualTax)} mills=${(r.totalRate).toFixed(3)}%`)
  console.log(`  rows: ${rowsStr}`)
  console.log(`  checks: ${checks}`)
  if (c.notes) console.log(`  note: ${c.notes}`)
  console.log()

  known.push({ name: `${c.county}/${c.town}`, pass: allOk, detail: rowsStr })
}

console.log('===== VALIDATION: 14 GA counties × 5 HB 581 patterns =====\n')
for (const c of CASES) checkCase(c)

// === Additional independence checks ===
console.log('===== EDGE CASES =====\n')

// E1: isPrimaryResidence=false → no homestead exemption applied
const noPrimary = calculatePropertyTax(
  { homeValue: 500000, county: 'Fulton', town: 'Atlanta', isPrimaryResidence: false },
  sd
)
const withPrimary = calculatePropertyTax(
  { homeValue: 500000, county: 'Fulton', town: 'Atlanta', isPrimaryResidence: true },
  sd
)
const homesteadSavings = noPrimary.annualTax - withPrimary.annualTax
// $2,000 homestead × 39.909 mills / 1000 = ~$80
const expectedHomesteadSavings = 2000 * (39.909 / 1000)
const homesteadOk = Math.abs(homesteadSavings - expectedHomesteadSavings) < 1
console.log(
  `${homesteadOk ? '✓' : '✗'} Homestead toggle: with=${fmt(withPrimary.annualTax)} without=${fmt(noPrimary.annualTax)} delta=${fmt(homesteadSavings)} (expected ~${fmt(expectedHomesteadSavings)})`
)
if (!homesteadOk) failures++

// E2: County-only fallback (no town) → should use county-level millage
const countyOnly = calculatePropertyTax(
  { homeValue: 350000, county: 'Henry', isPrimaryResidence: true },
  sd
)
const countyHasMillage = countyOnly.rateSource === 'ga_assessed_millage'
console.log(
  `${countyHasMillage ? '✓' : '✗'} County-only fallback (Henry, $350K): total=${fmt(countyOnly.annualTax)} source=${countyOnly.rateSource} rows=${countyOnly.gaJurisdictionBreakdown?.length ?? 0}`
)
if (!countyHasMillage) failures++

// E3: For schools-only-out, county-only fallback should still flag the County row as capped
const countyOnlyHenry = calculatePropertyTax(
  { homeValue: 350000, county: 'Henry', isPrimaryResidence: true },
  sd
)
const countyRowCapped = countyOnlyHenry.gaJurisdictionBreakdown?.find(r => r.label === 'County')?.isHb581Capped
const schoolRowCapped = countyOnlyHenry.gaJurisdictionBreakdown?.find(r => r.label === 'School')?.isHb581Capped
const countyFallbackOk = countyRowCapped === true && schoolRowCapped === false
console.log(
  `${countyFallbackOk ? '✓' : '✗'} Henry county-only: County capped=${countyRowCapped} (expected true), School capped=${schoolRowCapped} (expected false)`
)
if (!countyFallbackOk) failures++

// E4: Zero homeValue should not crash
try {
  const zero = calculatePropertyTax(
    { homeValue: 0, county: 'Fulton', town: 'Atlanta' },
    sd
  )
  const zeroOk = zero.annualTax === 0 && Number.isFinite(zero.annualTax)
  console.log(`${zeroOk ? '✓' : '✗'} Zero home value: total=${fmt(zero.annualTax)}`)
  if (!zeroOk) failures++
} catch (e) {
  console.log(`✗ Zero home value: threw ${(e as Error).message}`)
  failures++
}

// E5: Backward compat fixed values (these were correct pre-refactor)
const fixedValues: Array<{ name: string; county: string; town: string; fmv: number; expected: number }> = [
  { name: 'Atlanta $500K', county: 'Fulton', town: 'Atlanta', fmv: 500000, expected: 7902 },
  { name: 'Conyers $284K', county: 'Rockdale', town: 'Conyers', fmv: 284000, expected: 5902 },
  { name: 'Douglasville $359K', county: 'Douglas', town: 'Douglasville', fmv: 359000, expected: 5870 },
]
for (const t of fixedValues) {
  const r = calculatePropertyTax(
    { homeValue: t.fmv, county: t.county, town: t.town, isPrimaryResidence: true },
    sd
  )
  const diff = Math.abs(r.annualTax - t.expected)
  const ok = diff <= 5
  console.log(
    `${ok ? '✓' : '✗'} Fixed value ${t.name}: got=${fmt(r.annualTax)} expected=${fmt(t.expected)} diff=${fmt(diff)}`
  )
  if (!ok) failures++
}

console.log()
console.log('======================================================')
if (failures === 0) {
  console.log(`PASS — all ${CASES.length} cases + 5 edge cases validate cleanly`)
} else {
  console.log(`FAIL — ${failures} check(s) did not pass`)
  process.exit(1)
}
