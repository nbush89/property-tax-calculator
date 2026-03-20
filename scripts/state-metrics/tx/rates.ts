/**
 * Texas Comptroller annual county + city Rates and Levies XLSX → effectiveTaxRate series.
 */
import type { CountyMetricsPayload, TownMetricsPayload } from '../../lib/state-metrics-types'
import { buildSeries } from '../../lib/build-series'
import {
  TX_COUNTY_RATES_URL,
  TX_CITY_RATES_URL,
  TX_RATES_SOURCE_REF,
  TEXAS_CITY_WORKBOOK_COUNTY,
} from './config'
import {
  downloadBuffer,
  parseCountyRatesWorkbook,
  parseCityRatesWorkbook,
} from './comptroller-xlsx'
import { normalizeTexasCountyKey, normalizeTexasCityKey } from './normalize'

export type TexasCountyList = Array<{
  slug: string
  name?: string
  towns?: Array<{ name: string; slug: string }>
}>

export type TexasRatesRunSummary = {
  yearsAttempted: number[]
  yearsSucceeded: number[]
  countiesMatchedPerYear: Record<number, number>
  townsMatchedPerYear: Record<number, number>
  workbookCountyRows: number
  workbookCityRows: number
  geoCounties: number
  geoTowns: number
  townsNeverMatched: string[]
  countiesNeverMatched: string[]
}

function pairKey(workbookCountyName: string, unitName: string): string {
  return `${normalizeTexasCountyKey(workbookCountyName)}||${normalizeTexasCityKey(unitName)}`
}

/**
 * Fetch Comptroller workbooks per year and merge county + city rates into payload objects.
 */
export async function applyTexasComptrollerRates(
  countiesList: TexasCountyList,
  countyOut: Record<string, CountyMetricsPayload>,
  townsOut: Record<string, TownMetricsPayload>,
  years: number[],
  log: (m: string) => void
): Promise<TexasRatesRunSummary> {
  const summary: TexasRatesRunSummary = {
    yearsAttempted: [...years],
    yearsSucceeded: [],
    countiesMatchedPerYear: {},
    townsMatchedPerYear: {},
    workbookCountyRows: 0,
    workbookCityRows: 0,
    geoCounties: countiesList.length,
    geoTowns: 0,
    townsNeverMatched: [],
    countiesNeverMatched: [],
  }

  const countyYearValues: Record<string, Record<number, number>> = {}
  const townYearValues: Record<string, Record<number, number>> = {}

  const slugToCountyName = new Map<string, string>()
  for (const c of countiesList) {
    const name = (c.name ?? c.slug).trim()
    slugToCountyName.set(c.slug, name)
    countyYearValues[c.slug] = {}
  }

  const townKeys: string[] = []
  for (const c of countiesList) {
    for (const t of c.towns ?? []) {
      summary.geoTowns++
      const tk = `${c.slug}/${t.slug}`
      townKeys.push(tk)
      townYearValues[tk] = {}
    }
  }

  for (const year of years) {
    let countyRows: ReturnType<typeof parseCountyRatesWorkbook> = []
    let cityRows: ReturnType<typeof parseCityRatesWorkbook> = []
    try {
      const cbuf = await downloadBuffer(TX_COUNTY_RATES_URL(year))
      countyRows = parseCountyRatesWorkbook(cbuf)
      summary.workbookCountyRows = Math.max(summary.workbookCountyRows, countyRows.length)
    } catch (e) {
      if (String(e).includes('NOT_FOUND')) {
        log(`[WARN] Texas county rates ${year}: file not found`)
      } else {
        log(`[WARN] Texas county rates ${year}: ${String(e)}`)
      }
      continue
    }
    try {
      const cityBuf = await downloadBuffer(TX_CITY_RATES_URL(year))
      cityRows = parseCityRatesWorkbook(cityBuf)
      summary.workbookCityRows = Math.max(summary.workbookCityRows, cityRows.length)
    } catch (e) {
      log(`[WARN] Texas city rates ${year}: ${String(e)}`)
      continue
    }

    summary.yearsSucceeded.push(year)

    const wbCountyByKey = new Map<string, number>()
    for (const r of countyRows) {
      wbCountyByKey.set(normalizeTexasCountyKey(r.countyName), r.totalRate)
    }

    let countiesHit = 0
    for (const c of countiesList) {
      const name = slugToCountyName.get(c.slug) ?? c.slug
      const rate = wbCountyByKey.get(normalizeTexasCountyKey(name))
      if (rate != null) {
        countyYearValues[c.slug]![year] = rate
        countiesHit++
      }
    }
    summary.countiesMatchedPerYear[year] = countiesHit

    const rateByPair = new Map<string, number>()
    for (const r of cityRows) {
      const k = pairKey(r.countyName, r.unitName)
      if (!rateByPair.has(k)) rateByPair.set(k, r.totalRate)
    }

    let townsHit = 0
    for (const c of countiesList) {
      for (const t of c.towns ?? []) {
        const townKey = `${c.slug}/${t.slug}`
        const wbCounty =
          TEXAS_CITY_WORKBOOK_COUNTY[townKey] ?? slugToCountyName.get(c.slug) ?? c.slug
        const k = pairKey(wbCounty, t.name)
        const rate = rateByPair.get(k)
        if (rate != null) {
          townYearValues[townKey]![year] = rate
          townsHit++
        }
      }
    }
    summary.townsMatchedPerYear[year] = townsHit
    log(
      `[OK] Texas Comptroller ${year}: counties ${countiesHit}/${countiesList.length}, towns ${townsHit}/${townKeys.length}`
    )
  }

  for (const c of countiesList) {
    const slug = c.slug
    const series = buildSeries(countyYearValues[slug] ?? {}, 'PERCENT', TX_RATES_SOURCE_REF)
    if (series.length) {
      const existing = countyOut[slug] ?? { metrics: {} }
      countyOut[slug] = {
        metrics: { ...existing.metrics, effectiveTaxRate: series },
      }
    } else {
      summary.countiesNeverMatched.push(slug)
    }
  }

  for (const tk of townKeys) {
    const series = buildSeries(townYearValues[tk] ?? {}, 'PERCENT', TX_RATES_SOURCE_REF)
    if (series.length) {
      const prev = townsOut[tk] ?? {}
      townsOut[tk] = { ...prev, effectiveTaxRate: series }
    } else {
      summary.townsNeverMatched.push(tk)
    }
  }

  const nTownMatched = townKeys.length - summary.townsNeverMatched.length
  log(
    `[SUMMARY] Texas Comptroller: years=[${summary.yearsSucceeded.join(',')}] | counties w/ rates: ${
      summary.geoCounties - summary.countiesNeverMatched.length
    }/${summary.geoCounties}, towns w/ rates: ${nTownMatched}/${townKeys.length}`
  )
  if (summary.townsNeverMatched.length) {
    log(`[SUMMARY] Unmatched towns: ${summary.townsNeverMatched.join('; ')}`)
  }

  return summary
}
