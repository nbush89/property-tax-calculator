/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'

type Unit = 'USD'
type DataPoint = { year: number; value: number; unit: Unit; sourceRef: string }

type SourceOut = {
  counties: Record<string, DataPoint[]>
  towns: Record<string, DataPoint[]>
  meta: { sourceRef: string }
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

function main() {
  const repoRoot = process.cwd()
  const statePath = path.join(repoRoot, 'data', 'states', 'new-jersey.json')
  const metricsPath = process.argv[2] // /tmp/nj-avg-tax-bill.json

  if (!fs.existsSync(statePath)) throw new Error(`Missing: ${statePath}`)
  if (!metricsPath || !fs.existsSync(metricsPath)) {
    throw new Error(`Usage: npx tsx scripts/merge-nj-avg-tax-bill.ts /path/to/nj-avg-tax-bill.json`)
  }

  const stateData = readJson(statePath)
  const src: SourceOut = readJson(metricsPath)

  // Ensure sources entry exists (don’t overwrite if already present)
  stateData.sources ||= {}
  stateData.sources[src.meta.sourceRef] ||= {
    name: 'NJ Division of Taxation',
    reference: 'Average Residential Tax Report (MOD IV)',
    url: 'https://www.nj.gov/treasury/taxation/lpt/statdata.shtml',
    notes: 'Municipality and county average residential tax bills by tax year.',
  }

  const counties: any[] = stateData.counties ?? []
  const countyBySlug = new Map<string, any>(counties.map(c => [String(c.slug), c]))

  // 1) Merge county series
  for (const [countySlug, series] of Object.entries(src.counties)) {
    const county = countyBySlug.get(countySlug)
    if (!county) continue
    county.metrics ||= {}
    county.metrics.averageResidentialTaxBill = series
    const y = latestYear(series)
    if (y) county.asOfYear = y
  }

  // 2) Merge town series (keyed by countySlug/townSlug)
  for (const [key, series] of Object.entries(src.towns)) {
    const [countySlug, townSlug] = key.split('/')
    const county = countyBySlug.get(countySlug)
    if (!county) continue
    county.towns ||= []
    const town = county.towns.find((t: any) => String(t.slug) === townSlug)
    if (!town) continue

    town.metrics ||= {}
    town.metrics.averageResidentialTaxBill = series
    const y = latestYear(series)
    if (y) town.asOfYear = y
  }

  writeJsonPretty(statePath, stateData)
  console.log(`[DONE] Merged AvgResTax series into ${statePath}`)
}

main()
