#!/usr/bin/env tsx
/**
 * Merge sourced metrics into data/states/{slug}.json
 *
 * Usage: npx tsx scripts/merge-state-metrics.ts --state new-jersey|texas <path-to-payload.json>
 *
 * New Jersey accepts:
 * - Unified payload from source-state-metrics (counties.metrics + towns by display name)
 * - Legacy MOD IV-only payload (counties/towns flat series; from `source-state-metrics --only modiv`)
 */
/* eslint-disable no-console */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { NJ_TIER1 } from './state-metrics/nj/config'
import { isStateMetricsSlug } from './lib/state-metrics-registry'
import { TX_RATES_SOURCE_REF } from './state-metrics/tx/config'

type Unit = 'USD' | 'PERCENT'
type DataPoint = { year: number; value: number; unit: Unit; sourceRef: string }

type TownMetricsIn = {
  medianHomeValue?: DataPoint[]
  effectiveTaxRate?: DataPoint[]
  averageResidentialTaxBill?: DataPoint[]
}

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJsonPretty(p: string, data: unknown): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function latestYear(series?: DataPoint[]): number | undefined {
  if (!series?.length) return undefined
  return series.reduce((m, d) => (d.year > m ? d.year : m), series[0].year)
}

function parseArgs(): { state: string; metricsPath: string } {
  const argv = process.argv.slice(2)
  let state = ''
  let metricsPath = ''
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state' && argv[i + 1]) state = argv[++i]
    else if (!argv[i].startsWith('--') && !metricsPath) metricsPath = argv[i]
  }
  return { state, metricsPath }
}

function isNjModivLegacy(payload: Record<string, unknown>): boolean {
  const counties = payload.counties as Record<string, unknown> | undefined
  if (!counties || typeof counties !== 'object') return false
  const first = Object.values(counties)[0]
  return Array.isArray(first) && first.length > 0 && typeof (first as DataPoint[])[0]?.year === 'number'
}

function ensureSourcesNj(stateData: Record<string, unknown>): void {
  const sources = (stateData.sources as Record<string, unknown>) ?? {}
  stateData.sources = sources
  sources['us_census_acs_profile_dp04'] ??= {
    publisher: 'U.S. Census Bureau',
    title: 'ACS 5-year Profile (DP04_0089E median home value)',
    type: 'api',
    homepageUrl: 'https://api.census.gov/data.html',
    notes: 'DP04_0089E = Owner-occupied units: Median value (dollars).',
  }
  sources['nj_div_taxation_general_effective_tax_rates'] ??= {
    publisher: 'NJ Division of Taxation',
    title: 'General & Effective Tax Rates by County and Municipality',
    type: 'pdf',
    homepageUrl: 'https://www.nj.gov/treasury/taxation/lpt/lpttaxrates.shtml',
    notes:
      'Effective Tax Rate is published by municipality; year-specific PDFs (e.g., 2024taxrates.pdf).',
  }
  sources['nj_modiv_avg_restax'] ??= {
    name: 'NJ Division of Taxation',
    reference: 'Average Residential Tax Report (MOD IV)',
    url: 'https://www.nj.gov/treasury/taxation/lpt/statdata.shtml',
    notes: 'Municipality and county average residential tax bills by tax year.',
  }
}

function mergeNjModivLegacy(
  stateData: Record<string, unknown>,
  src: {
    meta: { sourceRef: string }
    counties: Record<string, DataPoint[]>
    towns: Record<string, DataPoint[]>
  }
): void {
  const counties: any[] = (stateData.counties as any[]) ?? []
  const countyBySlug = new Map<string, any>(counties.map(c => [String(c.slug), c]))
  stateData.sources ??= {}
  ;(stateData.sources as Record<string, unknown>)[src.meta.sourceRef] ??= {
    name: 'NJ Division of Taxation',
    reference: 'Average Residential Tax Report (MOD IV)',
    url: 'https://www.nj.gov/treasury/taxation/lpt/statdata.shtml',
    notes: 'Municipality and county average residential tax bills by tax year.',
  }

  for (const [countySlug, series] of Object.entries(src.counties)) {
    const county = countyBySlug.get(countySlug)
    if (!county) continue
    county.metrics ??= {}
    county.metrics.averageResidentialTaxBill = series
    const y = latestYear(series)
    if (y) county.asOfYear = y
  }

  for (const [key, series] of Object.entries(src.towns)) {
    const [countySlug, townSlug] = key.split('/')
    const county = countyBySlug.get(countySlug)
    if (!county) continue
    county.towns ??= []
    const town = county.towns.find((t: any) => String(t.slug) === townSlug)
    if (!town) continue
    town.metrics ??= {}
    town.metrics.averageResidentialTaxBill = series
    const y = latestYear(series)
    if (y) town.asOfYear = y
  }
}

function mergeNewJerseyUnified(
  stateData: Record<string, unknown>,
  rawPayload: Record<string, unknown>
): void {
  ensureSourcesNj(stateData)

  const countyMetricsBySlug = (rawPayload.counties ?? {}) as Record<
    string,
    { metrics?: TownMetricsIn & { averageResidentialTaxBill?: DataPoint[] } }
  >
  const townMetricsByName = (rawPayload.towns ?? {}) as Record<string, TownMetricsIn>

  const counties: any[] = (stateData.counties as any[]) ?? []
  let updatedTowns = 0
  let updatedCounties = 0
  let missingTown = 0

  for (const county of counties) {
    const slug = String(county.slug)
    const countyIn = countyMetricsBySlug[slug]
    if (!countyIn?.metrics) continue
    county.metrics = county.metrics ?? {}
    if (countyIn.metrics.effectiveTaxRate?.length) {
      county.metrics.effectiveTaxRate = countyIn.metrics.effectiveTaxRate
      updatedCounties++
    }
    if (countyIn.metrics.averageResidentialTaxBill?.length) {
      county.metrics.averageResidentialTaxBill = countyIn.metrics.averageResidentialTaxBill
      const y = latestYear(countyIn.metrics.averageResidentialTaxBill)
      if (y) county.asOfYear = Math.max(county.asOfYear ?? 0, y)
    }
    if (countyIn.metrics.effectiveTaxRate?.length && !countyIn.metrics.averageResidentialTaxBill?.length) {
      const y = latestYear(countyIn.metrics.effectiveTaxRate)
      if (y) county.asOfYear = Math.max(county.asOfYear ?? 0, y)
    }
  }

  for (const { countySlug, townSlug, townName } of NJ_TIER1) {
    const county = counties.find((c: any) => String(c.slug) === countySlug)
    if (!county) {
      console.warn(`[WARN] County not found: ${countySlug}`)
      continue
    }
    county.towns ??= []
    const town = county.towns.find((t: any) => String(t.slug) === townSlug)
    if (!town) {
      console.warn(
        `[WARN] Town slug '${townSlug}' not found in county '${countySlug}'. Available: ${county.towns.map((t: any) => t.slug).join(', ')}`
      )
      missingTown++
      continue
    }

    const metricsIn = townMetricsByName[townName]
    if (!metricsIn) {
      console.warn(`[WARN] No metrics in payload for town: ${townName}`)
      continue
    }

    town.metrics ??= {}
    if (metricsIn.medianHomeValue?.length) {
      town.metrics.medianHomeValue = metricsIn.medianHomeValue
    }
    if (metricsIn.effectiveTaxRate?.length) {
      town.metrics.effectiveTaxRate = metricsIn.effectiveTaxRate
    }
    if (metricsIn.averageResidentialTaxBill?.length) {
      town.metrics.averageResidentialTaxBill = metricsIn.averageResidentialTaxBill
    }

    const y1 = latestYear(town.metrics.medianHomeValue)
    const y2 = latestYear(town.metrics.effectiveTaxRate)
    const y3 = latestYear(town.metrics.averageResidentialTaxBill)
    const asOf = Math.max(y1 ?? 0, y2 ?? 0, y3 ?? 0)
    if (asOf > 0) town.asOfYear = asOf

    updatedTowns++
  }

  console.log(`[DONE] NJ: counties touched: ${updatedCounties}, towns: ${updatedTowns}`)
  if (missingTown) console.log(`[WARN] Missing town rows: ${missingTown}`)
}

function ensureSourcesTx(
  stateData: Record<string, unknown>,
  payloadSourceRefs?: string[]
): void {
  const sources = (stateData.sources as Record<string, unknown>) ?? {}
  stateData.sources = sources
  sources['us_census_acs_profile_dp04'] ??= {
    publisher: 'U.S. Census Bureau',
    title: 'ACS 5-year Profile (DP04_0089E median home value)',
    type: 'api',
    homepageUrl: 'https://api.census.gov/data.html',
    notes: 'DP04_0089E = Owner-occupied units: Median value (dollars).',
  }
  sources['tx_comptroller_property_tax'] ??= {
    publisher: 'Texas Comptroller of Public Accounts',
    title: 'Property Tax Information',
    type: 'web',
    homepageUrl: 'https://comptroller.texas.gov/taxes/property-tax/',
    notes: 'County and local property tax rates and data.',
  }
  if (payloadSourceRefs?.includes(TX_RATES_SOURCE_REF)) {
    sources[TX_RATES_SOURCE_REF] ??= {
      publisher: 'Texas Comptroller of Public Accounts',
      title: 'Property tax rates (official)',
      type: 'web',
      homepageUrl: 'https://comptroller.texas.gov/taxes/property-tax/',
      notes: 'County/municipal effective rates when sourced from official Texas data.',
    }
  }
}

function mergeTexas(stateData: Record<string, unknown>, rawPayload: Record<string, unknown>): void {
  const meta = rawPayload.meta as { sourceRefs?: string[] } | undefined
  ensureSourcesTx(stateData, meta?.sourceRefs)

  const countyPayload = (rawPayload.counties ?? {}) as Record<
    string,
    { metrics?: TownMetricsIn & { averageResidentialTaxBill?: DataPoint[] } }
  >
  const townMetrics = (rawPayload.towns ?? rawPayload) as Record<string, TownMetricsIn>
  const counties = (stateData.counties as any[]) ?? []
  let updatedTowns = 0
  let updatedCounties = 0

  for (const county of counties) {
    const slug = String(county.slug)
    const countyIn = countyPayload[slug]
    if (countyIn?.metrics) {
      county.metrics = county.metrics ?? {}
      if (countyIn.metrics.effectiveTaxRate?.length) {
        county.metrics.effectiveTaxRate = countyIn.metrics.effectiveTaxRate
        updatedCounties++
      }
      if (countyIn.metrics.averageResidentialTaxBill?.length) {
        county.metrics.averageResidentialTaxBill = countyIn.metrics.averageResidentialTaxBill
        const y = latestYear(countyIn.metrics.averageResidentialTaxBill)
        if (y) county.asOfYear = Math.max(county.asOfYear ?? 0, y)
      }
      if (
        countyIn.metrics.effectiveTaxRate?.length &&
        !countyIn.metrics.averageResidentialTaxBill?.length
      ) {
        const y = latestYear(countyIn.metrics.effectiveTaxRate)
        if (y) county.asOfYear = Math.max(county.asOfYear ?? 0, y)
      }
    }

    for (const town of county.towns ?? []) {
      const townKey = `${slug}/${town.slug}`
      const metricsIn = townMetrics[townKey] ?? townMetrics[town.name]
      if (!metricsIn) continue

      const townObj = town as Record<string, unknown>
      townObj.metrics = townObj.metrics ?? {}
      const m = townObj.metrics as Record<string, unknown>
      if (metricsIn.medianHomeValue?.length) {
        m.medianHomeValue = metricsIn.medianHomeValue
      }
      if (metricsIn.effectiveTaxRate?.length) {
        m.effectiveTaxRate = metricsIn.effectiveTaxRate
      }
      if (metricsIn.averageResidentialTaxBill?.length) {
        m.averageResidentialTaxBill = metricsIn.averageResidentialTaxBill
      }

      const y1 = latestYear(metricsIn.medianHomeValue)
      const y2 = latestYear(metricsIn.effectiveTaxRate)
      const y3 = latestYear(metricsIn.averageResidentialTaxBill)
      const asOf = Math.max(y1 ?? 0, y2 ?? 0, y3 ?? 0)
      if (asOf > 0) townObj.asOfYear = asOf
      updatedTowns++
    }
  }

  console.log(`[DONE] Texas: counties touched: ${updatedCounties}, towns: ${updatedTowns}`)
}

function main() {
  const repoRoot = process.cwd()
  const { state, metricsPath } = parseArgs()

  if (!state || !metricsPath) {
    console.error(
      'Usage: npx tsx scripts/merge-state-metrics.ts --state new-jersey|texas <path-to-payload.json>'
    )
    process.exit(1)
  }
  if (!isStateMetricsSlug(state)) {
    console.error(`Unknown state: ${state}`)
    process.exit(1)
  }

  const statePath = path.join(repoRoot, 'data', 'states', `${state}.json`)
  if (!fs.existsSync(statePath)) {
    console.error(`Cannot find ${statePath}`)
    process.exit(1)
  }
  if (!fs.existsSync(metricsPath)) {
    console.error(`File not found: ${metricsPath}`)
    process.exit(1)
  }

  const stateData = readJson(statePath) as Record<string, unknown>
  const rawPayload = readJson(metricsPath) as Record<string, unknown>

  if (state === 'new-jersey') {
    if (isNjModivLegacy(rawPayload)) {
      mergeNjModivLegacy(stateData, rawPayload as any)
      console.log(`[DONE] Merged MOD IV (legacy) into ${statePath}`)
    } else {
      mergeNewJerseyUnified(stateData, rawPayload)
    }
  } else {
    mergeTexas(stateData, rawPayload)
  }

  writeJsonPretty(statePath, stateData)
  console.log(`Wrote: ${statePath}`)
}

main()
