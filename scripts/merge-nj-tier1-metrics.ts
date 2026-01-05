/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'

type Unit = 'USD' | 'PERCENT'
type DataPoint = { year: number; value: number; unit: Unit; sourceRef: string }

type TownMetricsIn = {
  medianHomeValue?: DataPoint[]
  effectiveTaxRate?: DataPoint[]
}

const TIER1_TOWN_TO_COUNTY: Record<string, string> = {
  Montclair: 'essex',
  Hoboken: 'hudson',
  Princeton: 'mercer',
  Ridgewood: 'bergen',
  Paramus: 'bergen',
  Summit: 'union',
  Westfield: 'union',
  Morristown: 'morris',
  Edison: 'middlesex',
  'Cherry Hill': 'camden',
}

function readJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJsonPretty(p: string, data: any): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function latestYear(series?: DataPoint[]): number | undefined {
  if (!series?.length) return undefined
  return series.reduce((m, d) => (d.year > m ? d.year : m), series[0].year)
}

function ensureSources(stateData: any) {
  stateData.sources ||= {}
  // Ensure keys exist (don’t overwrite if already present)
  stateData.sources.us_census_acs_profile_dp04 ||= {
    name: 'U.S. Census Bureau',
    reference: 'ACS 5-year Profile (DP04_0089E median home value)',
    url: 'https://api.census.gov/data.html',
    notes: 'DP04_0089E = Owner-occupied units: Median value (dollars)',
  }
  stateData.sources.nj_div_taxation_general_effective_tax_rates ||= {
    name: 'NJ Division of Taxation',
    reference: 'General & Effective Tax Rates by County and Municipality',
    url: 'https://www.nj.gov/treasury/taxation/lpt/lpttaxrates.shtml',
    notes:
      'Effective Tax Rate is published by municipality; year-specific PDFs (e.g., 2024taxrates.pdf).',
  }
}

function main() {
  const repoRoot = process.cwd()
  const statePath = path.join(repoRoot, 'data', 'states', 'new-jersey.json')
  const metricsPath = process.argv[2] // e.g. /tmp/nj-tier1-metrics.json

  if (!fs.existsSync(statePath)) {
    console.error(`Cannot find ${statePath}`)
    process.exit(1)
  }
  if (!metricsPath || !fs.existsSync(metricsPath)) {
    console.error(`Usage: npx tsx scripts/merge-nj-tier1-metrics.ts /path/to/nj-tier1-metrics.json`)
    process.exit(1)
  }

  const stateData = readJson(statePath)
  const townMetricsByName: Record<string, TownMetricsIn> = readJson(metricsPath)

  ensureSources(stateData)

  const counties: any[] = stateData.counties ?? []
  const countyBySlug = new Map<string, any>(counties.map(c => [String(c.slug), c]))

  let updated = 0
  let missingTown = 0

  for (const [townName, countySlug] of Object.entries(TIER1_TOWN_TO_COUNTY)) {
    const county = countyBySlug.get(countySlug)
    if (!county) {
      console.warn(`[WARN] County slug not found: ${countySlug} (for town ${townName})`)
      continue
    }
    county.towns ||= []

    const town = county.towns.find(
      (t: any) => String(t.name).toLowerCase() === townName.toLowerCase()
    )
    if (!town) {
      console.warn(`[WARN] Town not found under county '${countySlug}': ${townName}`)
      missingTown++
      continue
    }

    const metricsIn = townMetricsByName[townName]
    if (!metricsIn) {
      console.warn(`[WARN] No metrics found in metrics JSON for town: ${townName}`)
      continue
    }

    town.metrics ||= {}

    // Merge ONLY these two keys
    if (metricsIn.medianHomeValue?.length) {
      town.metrics.medianHomeValue = metricsIn.medianHomeValue
    }
    if (metricsIn.effectiveTaxRate?.length) {
      town.metrics.effectiveTaxRate = metricsIn.effectiveTaxRate
    }

    // Set asOfYear to newest available from either series (if present)
    const y1 = latestYear(town.metrics.medianHomeValue)
    const y2 = latestYear(town.metrics.effectiveTaxRate)
    const asOf = Math.max(y1 ?? 0, y2 ?? 0)
    if (asOf > 0) town.asOfYear = asOf

    updated++
  }

  writeJsonPretty(statePath, stateData)

  console.log(`[DONE] Updated towns: ${updated}`)
  if (missingTown) {
    console.log(
      `[NOTE] Missing towns in new-jersey.json: ${missingTown} (add them first, then rerun)`
    )
  }
  console.log(`Wrote: ${statePath}`)
}

main()
