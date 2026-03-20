/**
 * QA: publish readiness for state / county / town pages.
 *
 * Examples:
 *   npx tsx scripts/validate-publish-readiness.ts --state new-jersey --type state
 *   npx tsx scripts/validate-publish-readiness.ts --state new-jersey --county bergen --type county
 *   npx tsx scripts/validate-publish-readiness.ts --state texas --county harris --town houston --type town
 *   npx tsx scripts/validate-publish-readiness.ts --state texas --all-counties --format table
 *   npx tsx scripts/validate-publish-readiness.ts --state texas --county harris --all-towns --format table
 *   npx tsx scripts/validate-publish-readiness.ts --state new-jersey --all-towns --format json | head
 */

import {
  validateTownPublishReadiness,
  validateCountyPublishReadiness,
  validateStatePublishReadiness,
  type PublishReadinessResult,
} from '@/lib/publishReadiness'
import { getStateData } from '@/lib/geo'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { getTownSlug } from '@/lib/links/towns'
import { slugifyLocation } from '@/utils/locationUtils'

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (!a?.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      out[key] = next
      i++
    } else {
      out[key] = true
    }
  }
  return out
}

function printTableRow(
  cols: { label: string; width: number; pad?: 'start' | 'end' }[],
  values: string[]
) {
  const cells = cols.map((c, i) => {
    const v = values[i] ?? ''
    const w = c.width
    if (c.pad === 'start') return v.slice(0, w).padStart(w)
    return v.slice(0, w).padEnd(w)
  })
  console.log(cells.join('  '))
}

function summarize(result: PublishReadinessResult): string {
  const err = result.issues.filter(i => i.severity === 'error').length
  const warn = result.issues.filter(i => i.severity === 'warning').length
  return `errors=${err} warnings=${warn} strong=${result.strongPage}`
}

function run(): void {
  const args = parseArgs(process.argv)
  const stateSlug = String(args.state ?? '')
    .toLowerCase()
    .trim()
  const format = String(args.format ?? 'table').toLowerCase()
  const allCounties = args['all-counties'] === true
  const allTowns = args['all-towns'] === true

  if (!stateSlug) {
    console.error('Usage: --state <slug> [--county slug] [--town slug] [--type state|county|town]')
    console.error('Batch: --all-counties | --all-towns (with --county for county-scoped towns)')
    console.error('Output: --format table|json')
    process.exit(1)
  }

  const stateData = getStateData(stateSlug)
  if (!stateData && !allCounties) {
    console.error(`Unknown state: ${stateSlug}`)
    process.exit(1)
  }

  let results: PublishReadinessResult[] = []

  if (allCounties && stateData) {
    for (const c of stateData.counties) {
      results.push(
        validateCountyPublishReadiness({ stateSlug, countySlug: c.slug || slugifyLocation(c.name) })
      )
    }
  } else if (allTowns && stateData) {
    const countyFilter = args.county ? String(args.county) : null
    for (const c of stateData.counties) {
      if (countyFilter) {
        const norm = countyFilter.replace(/-county-property-tax$/i, '').toLowerCase()
        const match =
          c.slug === norm ||
          slugifyLocation(c.name) === norm ||
          c.name.toLowerCase().replace(/\s+county$/i, '') === norm
        if (!match) continue
      }
      for (const t of c.towns ?? []) {
        if (!getTownSlug(t) || !isTownPublished(t)) continue
        const slug = getTownSlug(t)
        if (!slug) continue
        results.push(
          validateTownPublishReadiness({
            stateSlug,
            countySlug: c.slug || slugifyLocation(c.name),
            townSlug: slug,
          })
        )
      }
    }
  } else {
    let entityType = String(args.type ?? '').toLowerCase()
    if (!entityType) {
      if (args.town) entityType = 'town'
      else if (args.county) entityType = 'county'
      else entityType = 'state'
    }

    if (entityType === 'state') {
      results = [validateStatePublishReadiness({ stateSlug })]
    } else if (entityType === 'county') {
      const c = String(args.county ?? '')
      if (!c) {
        console.error('--county required for county validation')
        process.exit(1)
      }
      results = [validateCountyPublishReadiness({ stateSlug, countySlug: c })]
    } else if (entityType === 'town') {
      const c = String(args.county ?? '')
      const t = String(args.town ?? '')
      if (!c || !t) {
        console.error('--county and --town required for town validation')
        process.exit(1)
      }
      results = [
        validateTownPublishReadiness({
          stateSlug,
          countySlug: c,
          townSlug: t,
        }),
      ]
    } else {
      console.error('Unknown --type', entityType)
      process.exit(1)
    }
  }

  if (format === 'json') {
    console.log(JSON.stringify(results, null, 2))
    return
  }

  printTableRow(
    [
      { label: 'entity', width: 42 },
      { label: 'decision', width: 22 },
      { label: 'score', width: 5, pad: 'start' },
      { label: 'summary', width: 28 },
    ],
    ['entity', 'decision', 'score', 'summary']
  )
  printTableRow(
    [
      { label: 'entity', width: 42 },
      { label: 'decision', width: 22 },
      { label: 'score', width: 5, pad: 'start' },
      { label: 'summary', width: 28 },
    ],
    ['------------------------------------------', '----------------------', '-----', '----------------------------']
  )

  for (const r of results) {
    printTableRow(
      [
        { label: 'entity', width: 42 },
        { label: 'decision', width: 22 },
        { label: 'score', width: 5, pad: 'start' },
        { label: 'summary', width: 28 },
      ],
      [r.entityLabel.slice(0, 42), r.decision, String(r.score), summarize(r)]
    )
  }

  const errors = results.flatMap(r => r.issues.filter(i => i.severity === 'error'))
  const warnings = results.flatMap(r => r.issues.filter(i => i.severity === 'warning'))

  if (errors.length + warnings.length > 0 && results.length <= 5) {
    console.log('\nIssues (detail):')
    for (const r of results) {
      const sig = r.issues.filter(i => i.severity === 'error' || i.severity === 'warning')
      if (sig.length === 0) continue
      console.log(`\n— ${r.entityLabel}`)
      for (const i of sig) console.log(`  [${i.severity}] ${i.code}: ${i.message}`)
    }
  } else if (errors.length + warnings.length > 0) {
    console.log(`\n(${errors.length} errors, ${warnings.length} warnings across ${results.length} pages — use --format json for full detail)`)
  }

  const holdCount = results.filter(r => r.decision === 'hold').length
  if (holdCount > 0) {
    process.exitCode = 2
  }
}

run()
