/**
 * Build the TownOverview used for at-a-glance: JSON overview, or synthesized from metrics + enrich.
 */

import type { TownData, CountyData, StateData } from '@/lib/data/types'
import { validateTownOverview } from './validate'
import { enrichOverviewYearsFromMetrics, deriveTownOverviewComparisons } from './derive'
import { pickBestTrendSeries } from './trend-series'
import { applyTrendPickToOverview } from './apply-trend-pick'
import type { TownOverview } from './types'
import { resolveSource } from '@/lib/data/town-helpers'

function defaultSourcesFromMetrics(
  stateData: StateData,
  town: TownData,
  county: CountyData
): TownOverview['sources'] {
  const refs = new Set<string>()
  for (const key of [
    'averageResidentialTaxBill',
    'effectiveTaxRate',
    'medianHomeValue',
    'medianTaxesPaid',
  ] as const) {
    const s = town.metrics?.[key]
    const last = s?.[s.length - 1]
    if (last?.sourceRef) refs.add(last.sourceRef)
  }
  for (const key of ['averageResidentialTaxBill', 'effectiveTaxRate'] as const) {
    const s = county.metrics?.[key]
    const last = s?.[s.length - 1]
    if (last?.sourceRef) refs.add(last.sourceRef)
  }
  // Resolve refs to publisher+url tuples, then dedupe — multiple distinct
  // sourceRefs (e.g. acs_profile_dp04, b25103, county_effective_rate) all
  // resolve to publisher "U.S. Census Bureau", which without this collapse
  // renders as three identical "U.S. Census Bureau" lines in the at-a-glance
  // sources footer.
  const seen = new Set<string>()
  const out: NonNullable<TownOverview['sources']> = []
  const retrieved = new Date().toISOString().slice(0, 10)
  for (const ref of refs) {
    const src = resolveSource(stateData, ref)
    if (!src) continue
    const key = `${src.publisher}|${src.homepageUrl ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      name: src.publisher,
      url: src.homepageUrl,
      retrieved,
    })
  }
  if (out.length === 0 && stateData.state.name) {
    out.push({
      name: `${stateData.state.name} public tax data`,
      url: undefined,
      retrieved: new Date().toISOString().slice(0, 10),
    })
  }
  return out
}

/**
 * Single overview for TownAtAGlance: validates after enrich + trend pick.
 */
export function resolveTownPageOverview(
  town: TownData,
  county: CountyData,
  stateData: StateData
): TownOverview | null {
  const asOfYear =
    town.asOfYear ?? county.asOfYear ?? stateData.state.asOfYear ?? new Date().getFullYear()

  let base: TownOverview
  if (town.overview && validateTownOverview(town.overview)) {
    base = { ...town.overview }
  } else {
    base = {
      asOfYear: typeof asOfYear === 'number' ? asOfYear : stateData.state.asOfYear,
      sources: defaultSourcesFromMetrics(stateData, town, county),
    }
    if (!validateTownOverview(base)) {
      return null
    }
  }

  const enriched = enrichOverviewYearsFromMetrics(town, county, base, stateData)
  deriveTownOverviewComparisons(enriched)

  const trendPick = pickBestTrendSeries(town, county)
  applyTrendPickToOverview(enriched, trendPick)

  deriveTownOverviewComparisons(enriched)

  if (!validateTownOverview(enriched)) {
    return null
  }

  return enriched
}
