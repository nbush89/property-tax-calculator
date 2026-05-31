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

// Load .env so CENSUS_API_KEY (and other vars) are available without dotenv.
// process.loadEnvFile is available in Node 20.12+. Silently skip if file absent.
try {
  ;(process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile('.env')
} catch {
  // .env not present or Node < 20.12 — continue without it
}

import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildRecentYears } from './utils/buildRecentYears'
import {
  fetchAcsDp04Maps,
  fetchAcsMedianHomeValueMap,
  fetchAcsMedianTaxesPaidMap,
  fetchAcsCountyEffectiveRateMap,
  fetchAcsCountyMedianTaxesPaidMap,
  fetchAcsStateEffectiveRate,
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
import {
  GA_COUNTIES,
  GA_TOWNS,
  GA_DOR_MILLAGE_SOURCE_REF,
  GA_MILLAGE_YEAR,
} from './state-metrics/ga/config'
import {
  parseMillagePdf,
  buildMillageMap,
  getTotalMillageForTown,
} from './state-metrics/ga/millage'

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
  let gaMillagePdf: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state' && argv[i + 1]) {
      state = argv[++i]
    } else if (argv[i] === '--out' && argv[i + 1]) {
      out = argv[++i]
    } else if (argv[i] === '--skip-modiv') {
      skipModiv = true
    } else if (argv[i] === '--only' && argv[i + 1] === 'modiv') {
      onlyModiv = true
    } else if (argv[i] === '--ga-millage-pdf' && argv[i + 1]) {
      gaMillagePdf = argv[++i]
    }
  }
  return { state, out, skipModiv, onlyModiv, gaMillagePdf }
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
  // ALSO fetch county-level median taxes paid (raw dollars) for trend display —
  // the rate alone is misleading when home values rise faster than millage.
  const countyRateMaps = new Map<number, Map<string, number>>()
  const countyTaxesMaps = new Map<number, Map<string, number>>()
  for (const y of ACS_YEARS) {
    try {
      const rateMap = await fetchAcsCountyEffectiveRateMap(y, STATE_FIPS.texas)
      countyRateMaps.set(y, rateMap)
      log(`[OK] ACS county rates ${y}: ${rateMap.size} TX counties`)
    } catch (e) {
      log(`[WARN] ACS county rates ${y} failed: ${String(e)}`)
      countyRateMaps.set(y, new Map())
    }
    try {
      const taxesMap = await fetchAcsCountyMedianTaxesPaidMap(y, STATE_FIPS.texas)
      countyTaxesMaps.set(y, taxesMap)
      log(`[OK] ACS county taxes paid ${y}: ${taxesMap.size} TX counties`)
    } catch (e) {
      log(`[WARN] ACS county taxes paid ${y} failed: ${String(e)}`)
      countyTaxesMaps.set(y, new Map())
    }
  }
  for (const county of stateJson.counties ?? []) {
    const countyName =
      'name' in county && typeof (county as { name: string }).name === 'string'
        ? (county as { name: string }).name
        : county.slug
    // Effective rate series
    const yearToRate: Record<number, number | undefined> = {}
    for (const [y, rateMap] of countyRateMaps) {
      const rate = rateMap.get(countyName)
      if (rate != null) yearToRate[y] = rate
    }
    const rateSeries = buildSeries(yearToRate, 'PERCENT', ACS_COUNTY_RATE_SOURCE_REF)
    if (rateSeries.length) {
      countyOut[county.slug] ??= { metrics: {} }
      countyOut[county.slug].metrics ??= {}
      countyOut[county.slug].metrics!.effectiveTaxRate = rateSeries
      const latest = rateSeries[rateSeries.length - 1]
      log(`[OK] ${countyName} county ACS rate: ${latest.value.toFixed(2)}% (${latest.year})`)
    } else {
      log(`[WARN] No ACS county rate found for ${countyName}`)
    }
    // Median taxes paid series (raw dollars)
    const yearToTaxes: Record<number, number | undefined> = {}
    for (const [y, taxesMap] of countyTaxesMaps) {
      const taxes = taxesMap.get(countyName)
      if (taxes != null) yearToTaxes[y] = taxes
    }
    const taxesSeries = buildSeries(yearToTaxes, 'USD', ACS_TAX_SOURCE_REF)
    if (taxesSeries.length) {
      countyOut[county.slug] ??= { metrics: {} }
      countyOut[county.slug].metrics ??= {}
      countyOut[county.slug].metrics!.medianTaxesPaid = taxesSeries
      const latest = taxesSeries[taxesSeries.length - 1]
      log(`[OK] ${countyName} county median taxes paid: $${latest.value} (${latest.year})`)
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

  // State-level effective rate (ACS B25103/B25077 at state geography)
  const stateRateByYear: Record<number, number | undefined> = {}
  for (const y of ACS_YEARS) {
    try {
      const r = await fetchAcsStateEffectiveRate(y, STATE_FIPS.texas)
      if (r != null) {
        stateRateByYear[y] = r
        log(`[OK] ACS state-level rate ${y}: ${r.toFixed(2)}%`)
      }
    } catch (e) {
      log(`[WARN] ACS state-level rate ${y} failed: ${String(e)}`)
    }
  }
  const stateRateSeries = buildSeries(stateRateByYear, 'PERCENT', ACS_COUNTY_RATE_SOURCE_REF)

  const payload: StateMetricsSourcePayload = {
    meta: {
      stateSlug: 'texas',
      generatedAt: new Date().toISOString(),
      sourceRefs,
    },
    state: stateRateSeries.length ? { averageTaxRate: stateRateSeries } : undefined,
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

/**
 * Georgia sourcing.
 *
 * Two data sources:
 *   1. ACS DP04_0089E (median home value) + B25103_001E (median taxes paid) +
 *      county effective rate (B25103/B25077). Same pattern as Texas.
 *   2. GA DOR consolidated millage PDF (OCR-parsed). Provides per-jurisdiction
 *      M&O + Bond mills, which are summed and stored as MillageBreakdown
 *      objects on each town (and county fallback).
 *
 * The millage PDF must be provided via --ga-millage-pdf <path>. If absent,
 * the GA pipeline runs ACS-only and writes empty millage payloads — the
 * calculator will then fall back to the ACS-implied rate.
 */
async function sourceGeorgia(options: { out: string; gaMillagePdf?: string }) {
  const stateJson = loadStateJson<{ counties: CountyList }>('georgia')
  const log = (m: string) => console.error(m)

  // === ACS layer (mirrors Texas) ===
  const mhvMaps = new Map<number, Map<string, number>>()
  const taxMaps = new Map<number, Map<string, number>>()
  for (const y of ACS_YEARS) {
    try {
      const { homeValue } = await fetchAcsDp04Maps(y, STATE_FIPS.georgia, 'texas')
      mhvMaps.set(y, homeValue)
      log(`[OK] ACS DP04 ${y}: ${homeValue.size} GA places (homeValue)`)
    } catch (e) {
      log(`[WARN] ACS DP04 ${y} failed: ${String(e)}`)
      mhvMaps.set(y, new Map())
    }
    try {
      const taxMap = await fetchAcsMedianTaxesPaidMap(y, STATE_FIPS.georgia, 'texas')
      taxMaps.set(y, taxMap)
      log(`[OK] ACS B25103 ${y}: ${taxMap.size} GA places (medianTaxesPaid)`)
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
    for (const town of county.towns ?? []) {
      const townKey = `${countySlug}/${town.slug}`
      const { series: mhvSeries, acsMatchKey } = medianHomeSeriesForTown(
        town.name,
        'Georgia',
        ACS_YEARS,
        mhvMaps,
        'texas' // Re-uses TX-style "places" lookup; GA places resolve the same way.
      )
      const { series: taxSeries } = medianTaxesSeriesForTown(
        town.name,
        'Georgia',
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
        debug: { acsMatchKey, countySlug, townSlug: town.slug, townName: town.name },
      }
    }
  }

  // County-level effective rate (ACS B25103 / B25077) AND
  // county-level median taxes paid (raw B25103 dollar value).
  const countyRateMaps = new Map<number, Map<string, number>>()
  const countyTaxesMaps = new Map<number, Map<string, number>>()
  for (const y of ACS_YEARS) {
    try {
      const rateMap = await fetchAcsCountyEffectiveRateMap(y, STATE_FIPS.georgia)
      countyRateMaps.set(y, rateMap)
      log(`[OK] ACS county rates ${y}: ${rateMap.size} GA counties`)
    } catch (e) {
      log(`[WARN] ACS county rates ${y} failed: ${String(e)}`)
      countyRateMaps.set(y, new Map())
    }
    try {
      const taxesMap = await fetchAcsCountyMedianTaxesPaidMap(y, STATE_FIPS.georgia)
      countyTaxesMaps.set(y, taxesMap)
      log(`[OK] ACS county taxes paid ${y}: ${taxesMap.size} GA counties`)
    } catch (e) {
      log(`[WARN] ACS county taxes paid ${y} failed: ${String(e)}`)
      countyTaxesMaps.set(y, new Map())
    }
  }
  for (const county of stateJson.counties ?? []) {
    const countyName =
      'name' in county && typeof (county as { name: string }).name === 'string'
        ? (county as { name: string }).name
        : county.slug
    // Effective rate series
    const yearToRate: Record<number, number | undefined> = {}
    for (const [y, rateMap] of countyRateMaps) {
      const rate = rateMap.get(countyName)
      if (rate != null) yearToRate[y] = rate
    }
    const rateSeries = buildSeries(yearToRate, 'PERCENT', ACS_COUNTY_RATE_SOURCE_REF)
    if (rateSeries.length) {
      countyOut[county.slug] ??= { metrics: {} }
      countyOut[county.slug].metrics ??= {}
      countyOut[county.slug].metrics!.effectiveTaxRate = rateSeries
      const latest = rateSeries[rateSeries.length - 1]
      log(`[OK] ${countyName} county ACS rate: ${latest.value.toFixed(2)}% (${latest.year})`)
    } else {
      log(`[WARN] No ACS county rate found for ${countyName}`)
    }
    // Median taxes paid series
    const yearToTaxes: Record<number, number | undefined> = {}
    for (const [y, taxesMap] of countyTaxesMaps) {
      const taxes = taxesMap.get(countyName)
      if (taxes != null) yearToTaxes[y] = taxes
    }
    const taxesSeries = buildSeries(yearToTaxes, 'USD', ACS_TAX_SOURCE_REF)
    if (taxesSeries.length) {
      countyOut[county.slug] ??= { metrics: {} }
      countyOut[county.slug].metrics ??= {}
      countyOut[county.slug].metrics!.medianTaxesPaid = taxesSeries
      const latest = taxesSeries[taxesSeries.length - 1]
      log(`[OK] ${countyName} county median taxes paid: $${latest.value} (${latest.year})`)
    }
  }

  // === GA DOR millage layer (OCR-based) ===
  const sourceRefs: string[] = [ACS_SOURCE_REF, ACS_COUNTY_RATE_SOURCE_REF, ACS_TAX_SOURCE_REF]
  if (options.gaMillagePdf) {
    log(`[OK] Parsing GA DOR millage PDF: ${options.gaMillagePdf}`)
    const rows = await parseMillagePdf(options.gaMillagePdf, { log })
    const map = buildMillageMap(rows)
    log(`[OK] Parsed millage: ${rows.length} rows across ${map.size} counties`)
    const flagged = rows.filter(r => r.flagged)
    if (flagged.length > 0) {
      log(`[WARN] ${flagged.length} flagged rows (out-of-range values)`)
      for (const r of flagged.slice(0, 10)) {
        log(`  ${r.county}/${r.district}: ${r.flagReason}`)
      }
    }

    // County-level: county M&O + school + state
    for (const { countySlug, countyName } of GA_COUNTIES) {
      const upper = countyName.toUpperCase()
      const districts = map.get(upper)
      if (!districts) {
        log(`[MISSING] County millage for ${countyName}`)
        continue
      }
      const inc = districts.get('COUNTY INCORPORATED')
      const sch = districts.get('SCHOOL')
      const st = districts.get('STATE')
      if (!inc || !sch) {
        log(`[MISSING] Required county districts for ${countyName} (incorporated, school)`)
        continue
      }
      const county = (inc.mAndO ?? 0) + (inc.bond ?? 0)
      const school = (sch.mAndO ?? 0) + (sch.bond ?? 0)
      const state = st ? (st.mAndO ?? 0) + (st.bond ?? 0) : 0
      const total = county + school + state
      countyOut[countySlug] ??= { metrics: {} }
      countyOut[countySlug].metrics ??= {}
      countyOut[countySlug].metrics!.millage = [
        {
          year: GA_MILLAGE_YEAR,
          county,
          school,
          state,
          total,
          sourceRef: GA_DOR_MILLAGE_SOURCE_REF,
        },
      ]
      log(`[OK] ${countyName} county mills: ${total.toFixed(3)} (county=${county.toFixed(3)}, school=${school.toFixed(3)})`)
    }

    // Town-level: city + county + school + state.
    //
    // For cities with an independent school district (Atlanta, Decatur, Marietta,
    // etc.), use the IND SCHOOL row's mills instead of the county SCHOOL row.
    // Without this, Atlanta residents would be charged Fulton County Schools
    // (17.08 mills) instead of Atlanta Public Schools (~21.6 mills), under-
    // counting their bill by ~$900 on a $500k home.
    for (const t of GA_TOWNS) {
      const districts = map.get(t.countySlug.toUpperCase())
      if (!districts) continue
      const lookup = t.pdfDistrictName ?? t.townName.toUpperCase()
      const city = districts.get(lookup)
      const inc = districts.get('COUNTY INCORPORATED')
      const indSchool = t.indSchoolDistrictName ? districts.get(t.indSchoolDistrictName) : undefined
      const countySchool = districts.get('SCHOOL')
      const sch = indSchool ?? countySchool
      const usingIndSchool = !!indSchool
      const st = districts.get('STATE')
      const townKey = `${t.countySlug}/${t.townSlug}`
      if (!city || !inc || !sch) {
        const want = t.indSchoolDistrictName
          ? `(needed city=${lookup}, county-inc, school=${t.indSchoolDistrictName} or SCHOOL)`
          : `(lookup: ${lookup})`
        log(`[MISSING] Town millage for ${townKey} ${want}`)
        continue
      }
      if (t.indSchoolDistrictName && !indSchool) {
        log(
          `[WARN] ${townKey}: expected independent school "${t.indSchoolDistrictName}" not found; falling back to county SCHOOL (will undercount).`
        )
      }
      const cityMills = (city.mAndO ?? 0) + (city.bond ?? 0)
      const countyMills = (inc.mAndO ?? 0) + (inc.bond ?? 0)
      const schoolMills = (sch.mAndO ?? 0) + (sch.bond ?? 0)
      const stateMills = st ? (st.mAndO ?? 0) + (st.bond ?? 0) : 0
      const total = cityMills + countyMills + schoolMills + stateMills
      townsOut[townKey] ??= {}
      townsOut[townKey].millage = [
        {
          year: GA_MILLAGE_YEAR,
          city: cityMills,
          county: countyMills,
          school: schoolMills,
          state: stateMills,
          total,
          sourceRef: GA_DOR_MILLAGE_SOURCE_REF,
        },
      ]
      log(
        `[OK] ${townKey} mills: ${total.toFixed(3)} (city=${cityMills.toFixed(3)}, school=${schoolMills.toFixed(3)}${usingIndSchool ? ' [IND]' : ''}, total=${total.toFixed(3)})`
      )
    }
    sourceRefs.push(GA_DOR_MILLAGE_SOURCE_REF)
  } else {
    log('[INFO] No --ga-millage-pdf provided; skipping millage layer (calculator will fall back to ACS-implied rate).')
  }

  // State-level effective rate (ACS B25103/B25077 at state geography) — used
  // as "Avg Rate" on the cross-state landing page. Time series.
  const stateRateByYear: Record<number, number | undefined> = {}
  for (const y of ACS_YEARS) {
    try {
      const r = await fetchAcsStateEffectiveRate(y, STATE_FIPS.georgia)
      if (r != null) {
        stateRateByYear[y] = r
        log(`[OK] ACS state-level rate ${y}: ${r.toFixed(2)}%`)
      }
    } catch (e) {
      log(`[WARN] ACS state-level rate ${y} failed: ${String(e)}`)
    }
  }
  const stateRateSeries = buildSeries(stateRateByYear, 'PERCENT', ACS_COUNTY_RATE_SOURCE_REF)

  const payload: StateMetricsSourcePayload = {
    meta: {
      stateSlug: 'georgia',
      generatedAt: new Date().toISOString(),
      sourceRefs,
    },
    state: stateRateSeries.length ? { averageTaxRate: stateRateSeries } : undefined,
    counties: countyOut,
    towns: townsOut,
  }

  const outPath =
    options.out || path.join(process.cwd(), 'data', 'georgia-town-metrics.json')
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
  log(
    `[OK] Wrote ${outPath} (${Object.keys(countyOut).length} counties, ${Object.keys(townsOut).length} towns)`
  )
}

async function main() {
  const { state, out, skipModiv, onlyModiv, gaMillagePdf } = parseArgs()
  if (!state) {
    console.error(
      'Usage: npx tsx scripts/source-state-metrics.ts --state new-jersey|texas|georgia [--out path] [--skip-modiv] [--ga-millage-pdf path]\n' +
        '       npx tsx scripts/source-state-metrics.ts --state new-jersey --only modiv  (stdout: legacy MOD IV JSON)'
    )
    process.exit(1)
  }
  if (!isStateMetricsSlug(state)) {
    console.error(
      `Unknown state: ${state}. Supported: ${['new-jersey', 'texas', 'georgia'].join(', ')}`
    )
    process.exit(1)
  }
  if (state === 'new-jersey') {
    await sourceNewJersey({ out, skipModiv, onlyModiv })
  } else if (state === 'georgia') {
    if (onlyModiv) {
      console.error('--only modiv is only valid for new-jersey')
      process.exit(1)
    }
    await sourceGeorgia({ out, gaMillagePdf })
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
