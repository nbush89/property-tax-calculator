/* eslint-disable no-console */
/**
 * Apply TownOverview to every town from existing metrics.
 * Run after merge-nj-avg-tax-bill and merge-nj-tier1-metrics so metrics are present.
 * Logs warnings for towns missing avgResidentialTaxBill or effectiveTaxRatePct; does not fail.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { StateData } from '@/lib/data/types'
import { buildTownOverviewFromMetrics } from '@/lib/town-overview/build-from-metrics'

function readJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJsonPretty(p: string, data: any): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function main() {
  const repoRoot = process.cwd()
  const statePath = path.join(repoRoot, 'data', 'states', 'new-jersey.json')

  if (!fs.existsSync(statePath)) {
    console.error(`Missing: ${statePath}`)
    process.exit(1)
  }

  const raw = readJson(statePath)
  const stateData: StateData = {
    state: raw.state,
    sources: raw.sources ?? {},
    metrics: raw.metrics,
    counties: raw.counties ?? [],
  }

  const retrievedDate = new Date().toISOString().slice(0, 10)
  let applied = 0
  const missingBill: string[] = []
  const missingRate: string[] = []
  const missingMedian: string[] = []

  for (const county of stateData.counties) {
    const towns = county.towns ?? []
    for (const town of towns) {
      town.overview = buildTownOverviewFromMetrics(town, county, stateData, {
        retrievedDate,
      })
      applied++

      if (town.overview.avgResidentialTaxBill == null) {
        missingBill.push(`${town.name} (${county.name})`)
      }
      if (town.overview.effectiveTaxRatePct == null) {
        missingRate.push(`${town.name} (${county.name})`)
      }
      if (town.overview.medianHomeValue == null) {
        missingMedian.push(`${town.name} (${county.name})`)
      }
    }
  }

  writeJsonPretty(statePath, raw)

  console.log(`[DONE] Applied overview to ${applied} towns. Wrote: ${statePath}`)

  if (missingBill.length > 0) {
    console.warn(
      `[WARN] Towns missing overview.avgResidentialTaxBill (${missingBill.length}): ${missingBill.slice(0, 10).join(', ')}${missingBill.length > 10 ? '…' : ''}`
    )
  }
  if (missingRate.length > 0) {
    console.warn(
      `[WARN] Towns missing overview.effectiveTaxRatePct (${missingRate.length}): ${missingRate.slice(0, 10).join(', ')}${missingRate.length > 10 ? '…' : ''}`
    )
  }
  if (missingMedian.length > 0) {
    console.warn(
      `[WARN] Towns missing overview.medianHomeValue (${missingMedian.length}): ${missingMedian.slice(0, 10).join(', ')}${missingMedian.length > 10 ? '…' : ''}`
    )
  }
}

main()
