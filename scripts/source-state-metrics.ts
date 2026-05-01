#!/usr/bin/env tsx
/**
 * Unified state metrics sourcing: shared Census ACS + state-specific plugins.
 *
 * Usage:
 *   npx tsx scripts/source-state-metrics.ts --state new-jersey [--out path] [--skip-modiv]
 *   npx tsx scripts/source-state-metrics.ts --state texas [--out path]
 *   npx tsx scripts/source-state-metrics.ts --state new-jersey --only modiv   (legacy MOD IV JSON to stdout)
 */
/* eslint-disable no-console */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildRecentYears } from './utils/buildRecentYears'
import {
  fetchAcsDp04Maps,
  fetchAcsMedianHomeValueMap,
  fetchAcsMedianTaxesPaidMap,
  fetchAcsCountyEffectiveRateMap,
  medianHomeSeriesForTown,
  medianTaxesSeriesForTown,
  ACS_SOURCE_REF,
  ACS_TAX_SOURCE_REF,
  ACS_COUNTY_RATE_SOURCE_REF,
} from './lib/acs-median-home-value'
import type {
  CountyMetricsPayload,
  StateMetricsSourcePayload,
  TownMetricsPayload,
} from './lib/state-metrics-types'
import { NJ_TIER1 } from './state-metrics/nj/config'
import {
  fetchGtrMapsForYears,
  buildCountyEffectiveFromGtr,
  mergeTownEffectiveFromGtr,
  type CountyList,
} from './state-metrics/nj/gtr'
import { NJ_GTR_SOURCE_REF } from './state-metrics/nj/config'
import { runNjModivAvgTax, NJ_MODIV_SOURCE_REF } from './state-metrics/nj/modiv'
import { STATE_FIPS, isStateMetricsSlug } from './lib/state-metrics-registry'
import { TX_RATE_YEARS, TX_RATES_SOURCE_REF } from './state-metrics/tx/config'
import { applyTexasComptrollerRates } from './state-metrics/tx/rates'
import { buildSeries } from './lib/build-series'

const CURRENT_YEAR = new Date().getFullYear()
const ACS_YEARS = buildRecentYears({ endYear: CURRENT_YEAR - 2, window: 6 })
const GTR_YEARS = buildRecentYears({ endYear: CURRENT_YEAR - 1, window: 6 })
const MODIV_YEARS = buildRecentYears({ endYear: CURRENT_YEAR - 1, window: 6 })

type AcsStyle = 'nj' | 'texas'

async function buildAcsMapsForState(
  years: number[],
  stateFips: string,
  acsStateLabel: AcsStyle,
  log: (m: string) => void,
  displayLabel: string
): Promise<Map<number, Map<string, number>>> {
  const acsMaps = new Map<number, Map<string, number>>()
  for (const y of years) {
    try {
      const map = await fetchAcsMedianHomeValueMap(y, stateFips, acsStateLabel)
      acsMaps.set(y, map)
      log(`[OK] ACS ${y}: ${map.size} ${displayLabel} places`)
    } catch (e) {
      log(`[WARN] ACS ${y} failed: ${String(e)}`)
      acsMaps.set(y, new Map())
    }
  }
  return acsMaps
}

function parseArgs() {
  const argv = process.argv.slice(2)
  let state = ''
  let out = ''
  let skipModiv = false
  let onlyModiv = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state' && argv[i + 1]) {
      state = argv[++i]
    } else if (argv[i] === '--out' && argv[i + 1]) {
      out = argv[++i]
    } else if (argv[i] === '--skip-modiv') {
      skipModiv = true
    } else if (argv[i] === '--only' && argv[i + 1] === 'modiv') {
      onlyModiv = true
    }
  }
  return { state, out, skipModiv, onlyModiv }
}

function loadStateJson<T>(slug: string): T {
  const p = path.join(process.cwd(), 'data', 'states', `${slug}.json`)
  if (!fs.existsSync(p)) throw new Error(`State JSON not found: ${p}`)
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

function texasPayloadHasRateData(
  countyOut: Record<string, CountyMetricsPayload>,
  townsOut: Record<string, TownMetricsPayload>
): boolean {
  for (const c of Object.values(countyOut)) {
    if (c.metrics?.effectiveTaxRate?.length) return true
  }
  for (const t of Object.values(townsOut)) {
    if (t.effectiveTaxRate?.length) return true
  }
  return false
}

async function sourceNewJersey(options: { out: string; skipModiv: boolean; onlyModiv: boolean }) {
  if (options.onlyModiv) {
    const log = (m: string) => console.error(m)
    const result = await runNjModivAvgTax(MODIV_YEARS, log)
    const towns: Record<string, unknown> = {}
    for (const t of NJ_TIER1) {
      const series = result.townsByTownName[t.townName]
      if (series?.length) {
        towns[`${t.countySlug}/${t.townSlug}`] = series
      }
    }
    const legacy = {
      meta: {
        yearsRequested: MODIV_YEARS,
        yearsSucceeded: result.yearsSucceeded,
        sourceRef: NJ_MODIV_SOURCE_REF,
        generatedAt: new Date().toISOString(),
      },
      counties: result.counties,
      towns,
      debug: result.debug,
    }
    process.stdout.write(JSON.stringify(legacy, null, 2))
    return
  }

  const stateJson = loadStateJson<{ counties: CountyList }>('new-jersey')
  const countiesList = stateJson.counties ?? []
  const log = (m: string) => console.error(m)

  const acsMaps = await buildAcsMapsForState(
    ACS_YEARS,
    STATE_FIPS['new-jersey'],
    'nj',
    log,
    'NJ'
  )

  const townsOut: Record<string, TownMetricsPayload> = {}
  for (const { townName } of NJ_TIER1) {
    const { series, acsMatchKey } = medianHomeSeriesForTown(
      townName,
      'New Jersey',
      ACS_YEARS,
      acsMaps,
      'nj'
    )
    if (series.length === 0) {
      log(`[MISSING] medianHomeValue for ${townName} (ACS key: ${acsMatchKey})`)
    }
    townsOut[townName] = {
      medianHomeValue: series,
      effectiveTaxRate: [],
      debug: { acsMatchKey },
    }
  }

  const gtrMaps = await fetchGtrMapsForYears(GTR_YEARS, log)
  const countyOut = buildCountyEffectiveFromGtr(countiesList, GTR_YEARS, gtrMaps)
  mergeTownEffectiveFromGtr(townsOut, GTR_YEARS, gtrMaps, log)
  log(`[OK] County-level effectiveTaxRate: ${Object.keys(countyOut).length} counties`)

  if (!options.skipModiv) {
    const modiv = await runNjModivAvgTax(MODIV_YEARS, log)
    for (const [slug, series] of Object.entries(modiv.counties)) {
      if (!countyOut[slug]) countyOut[slug] = { metrics: {} }
      countyOut[slug].metrics ??= {}
      countyOut[slug].metrics!.averageResidentialTaxBill = series
    }
    for (const { townName } of NJ_TIER1) {
      const series = modiv.townsByTownName[townName]
      if (series?.length) {
        townsOut[townName] ??= {}
        townsOut[townName].averageResidentialTaxBill = series
      }
    }
  }

  const sourceRefs = [ACS_SOURCE_REF, NJ_GTR_SOURCE_REF]
  if (!options.skipModiv) sourceRefs.push(NJ_MODIV_SOURCE_REF)

  const payload: StateMetricsSourcePayload = {
    meta: {
      stateSlug: 'new-jersey',
      generatedAt: new Date().toISOString(),
      sourceRefs,
    },
    counties: countyOut,
    towns: townsOut,
  }

  if (!options.skipModiv) {
    ;(payload as { debug?: unknown }).debug = { modiv: 'included' }
  }

  const outPath =
    options.out ||
    path.join(process.cwd(), 'data', 'nj-state-metrics.json')
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
  log(`[OK] Wrote ${outPath} (${Object.keys(countyOut).length} counties, ${Object.keys(townsOut).length} towns)`)
}

async function sourceTexas(options: { out: string }) {
  const stateJson = loadStateJson<{ counties: CountyList }>('texas')
  const log = (m: string) => console.error(m)

  // Fetch median home value (DP04_0089E) from acs/acs5/profile per year.
  // Fetch median real estate taxes paid (B25103_001E) from acs/acs5 per year.
  // These use different API endpoints and must be fetched separately.
  const mhvMaps = new Map<number, Map<string, number>>()
  const taxMaps = new Map<number, Map<string, number>>()
  for (const y of ACS_YEARS) {
    try {
      const { homeValue } = await fetchAcsDp04Maps(y, STATE_FIPS.texas, 'texas')
      mhvMaps.set(y, homeValue)
      log(`[OK] ACS DP04 ${y}: ${homeValue.size} TX places (homeValue)`)
    } catch (e) {
      log(`[WARN] ACS DP04 ${y} failed: ${String(e)}`)
      mhvMaps.set(y, new Map())
    }
    try {
      const taxMap = await fetchAcsMedianTaxesPaidMap(y, STATE_FIPS.texas, 'texas')
      taxMaps.set(y, taxMap)
      log(`[OK] ACS B25103 ${y}: ${taxMap.size} TX places (medianTaxesPaid)`)
    } catch (e) {
      log(`[WARN] ACS B25103 ${y} failed: ${String(e)}`)
      taxMaps.set(y, new Map())
    }
  }

  const countyOut: Record<string, CountyMetricsPayload> = {}
  for (const county of stateJson.counties ?? []) {
    countyOut[county.slug] = countyOut[county.slug] ?? { metrics: {} }
  }

  const townsOut: Record<string, TownMetricsPayload> = {}
  for (const county of stateJson.counties ?? []) {
    const countySlug = county.slug
    const countyName =
      'name' in county && typeof (county as { name: string }).name === 'string'
        ? (county as { name: string }).name
        : countySlug
    for (const town of county.towns ?? []) {
      const townKey = `${countySlug}/${town.slug}`

      const { series: mhvSeries, acsMatchKey } = medianHomeSeriesForTown(
        town.name,
        'Texas',
        ACS_YEARS,
        mhvMaps,
        'texas'
      )
      const { series: taxSeries } = medianTaxesSeriesForTown(
        town.name,
        'Texas',
        ACS_YEARS,
        taxMaps,
        'texas'
      )

      if (mhvSeries.length === 0) {
        log(`[MISSING] medianHomeValue for ${town.name} (${townKey}) (ACS key: ${acsMatchKey})`)
      }
      if (taxSeries.length === 0) {
        log(`[MISSING] medianTaxesPaid for ${town.name} (${townKey}) (ACS key: ${acsMatchKey})`)
      }

      townsOut[townKey] = {
        medianHomeValue: mhvSeries,
        medianTaxesPaid: taxSeries,
        effectiveTaxRate: [],
        debug: {
          acsMatchKey,
          countySlug,
          countyName,
          townSlug: town.slug,
          townName: town.name,
        },
      }
    }
  }

  // County-level effectiveTaxRate: use ACS B25103/B25077 (blended rate across all taxing units).
  // This replaces the Comptroller county-unit-only rates which only captured the county
  // government's slice (~0.2–0.4%) rather than the full effective rate (~1.5–2.2%).
  const countyRateMaps = new Map<number, Map<string, number>>()
  for (const y of ACS_YEARS) {
    try {
      const rateMap = await fetchAcsCountyEffectiveRateMap(y, STATE_FIPS.texas)
      countyRateMaps.set(y, rateMap)
      log(`[OK] ACS county rates ${y}: ${rateMap.size} TX counties`)
    } catch (e) {
      log(`[WARN] ACS county rates ${y} failed: ${String(e)}`)
      countyRateMaps.set(y, new Map())
    }
  }
  for (const county of stateJson.counties ?? []) {
    const countyName =
      'name' in county && typeof (county as { name: string }).name === 'string'
        ? (county as { name: string }).name
        : county.slug
    const yearToRate: Record<number, number | undefined> = {}
    for (const [y, rateMap] of countyRateMaps) {
      const rate = rateMap.get(countyName)
      if (rate != null) yearToRate[y] = rate
    }
    const series = buildSeries(yearToRate, 'PERCENT', ACS_COUNTY_RATE_SOURCE_REF)
    if (series.length) {
      countyOut[county.slug] ??= { metrics: {} }
      countyOut[county.slug].metrics ??= {}
      countyOut[county.slug].metrics!.effectiveTaxRate = series
      const latest = series[series.length - 1]
      log(`[OK] ${countyName} county ACS rate: ${latest.value.toFixed(2)}% (${latest.year})`)
    } else {
      log(`[WARN] No ACS county rate found for ${countyName}`)
    }
  }

  // Town-level effectiveTaxRate: still sourced from Comptroller (city-unit rates).
  // These are also unit-only rates, but are used for relative within-county comparison.
  // TODO: replace with ACS place-level derived rates (medianTaxesPaid / medianHomeValue)
  // when sufficient ACS place coverage is confirmed for TX towns.
  await applyTexasComptrollerRates(
    stateJson.counties ?? [],
    {} as Record<string, CountyMetricsPayload>, // skip county output — already set above
    townsOut,
    TX_RATE_YEARS,
    log
  )

  const sourceRefs: string[] = [ACS_SOURCE_REF, ACS_COUNTY_RATE_SOURCE_REF]
  if (texasPayloadHasRateData({}, townsOut)) {
    sourceRefs.push(TX_RATES_SOURCE_REF)
  }

  const payload: StateMetricsSourcePayload = {
    meta: {
      stateSlug: 'texas',
      generatedAt: new Date().toISOString(),
      sourceRefs,
    },
    counties: countyOut,
    towns: townsOut,
  }

  const outPath =
    options.out || path.join(process.cwd(), 'data', 'texas-town-metrics.json')
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
  log(
    `[OK] Wrote ${outPath} (${Object.keys(countyOut).length} counties, ${Object.keys(townsOut).length} towns)`
  )
}

async function main() {
  const { state, out, skipModiv, onlyModiv } = parseArgs()
  if (!state) {
    console.error(
      'Usage: npx tsx scripts/source-state-metrics.ts --state new-jersey|texas [--out path] [--skip-modiv]\n' +
        '       npx tsx scripts/source-state-metrics.ts --state new-jersey --only modiv  (stdout: legacy MOD IV JSON)'
    )
    process.exit(1)
  }
  if (!isStateMetricsSlug(state)) {
    console.error(`Unknown state: ${state}. Supported: ${['new-jersey', 'texas'].join(', ')}`)
    process.exit(1)
  }
  if (state === 'new-jersey') {
    await sourceNewJersey({ out, skipModiv, onlyModiv })
  } else {
    if (onlyModiv) {
      console.error('--only modiv is only valid for new-jersey')
      process.exit(1)
    }
    await sourceTexas({ out })
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
