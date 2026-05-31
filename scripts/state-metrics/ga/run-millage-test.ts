#!/usr/bin/env tsx
/**
 * Standalone test runner for the GA millage parser.
 * Usage: npx tsx scripts/state-metrics/ga/run-millage-test.ts <path-to-pdf>
 *
 * Outputs:
 *   - Total rows parsed
 *   - Per-county row count for the 4 metro counties
 *   - Total millage for the 20 launch cities
 *   - Any flagged (out-of-range) rows
 */
/* eslint-disable no-console */
import { parseMillagePdf, buildMillageMap, getTotalMillageForTown } from './millage'
import { GA_COUNTIES, GA_TOWNS } from './config'

async function main() {
  const pdfPath = process.argv[2]
  if (!pdfPath) {
    console.error('Usage: tsx run-millage-test.ts <path-to-pdf>')
    process.exit(1)
  }

  const log = (m: string) => console.error(m)
  const rows = await parseMillagePdf(pdfPath, { log })
  const map = buildMillageMap(rows)

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total rows parsed: ${rows.length}`)
  console.log(`Total counties found: ${map.size}`)
  console.log(`Total flagged rows: ${rows.filter(r => r.flagged).length}`)

  console.log(`\n=== TARGET COUNTIES (4 metros) ===`)
  for (const { countyName } of GA_COUNTIES) {
    const upper = countyName.toUpperCase()
    const districts = map.get(upper)
    if (!districts) {
      console.log(`${countyName}: [MISSING — no rows]`)
      continue
    }
    console.log(`${countyName}: ${districts.size} districts`)
    for (const [name, row] of districts) {
      console.log(`  ${name.padEnd(40)} M&O=${row.mAndO.toFixed(3)}  Bond=${row.bond.toFixed(3)}${row.flagged ? ` [FLAG: ${row.flagReason}]` : ''}`)
    }
  }

  console.log(`\n=== TARGET TOWNS (millage breakdown) ===`)
  for (const t of GA_TOWNS) {
    const upper = t.pdfDistrictName ?? t.townName.toUpperCase()
    const totals = getTotalMillageForTown(map, t.countySlug.toUpperCase(), upper)
    if (!totals) {
      console.log(`${t.countySlug}/${t.townSlug} (lookup: ${upper}): [MISSING]`)
      continue
    }
    console.log(
      `${t.countySlug}/${t.townSlug}: total=${totals.total.toFixed(3)} (city=${totals.components.city.toFixed(3)}, county=${totals.components.county.toFixed(3)}, school=${totals.components.school.toFixed(3)}, state=${totals.components.state.toFixed(3)})`
    )
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
