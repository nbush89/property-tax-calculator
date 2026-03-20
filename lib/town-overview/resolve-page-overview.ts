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
  for (const key of ['averageResidentialTaxBill', 'effectiveTaxRate', 'medianHomeValue'] as const) {
    const s = town.metrics?.[key]
    const last = s?.[s.length - 1]
    if (last?.sourceRef) refs.add(last.sourceRef)
  }
  for (const key of ['averageResidentialTaxBill', 'effectiveTaxRate'] as const) {
    const s = county.metrics?.[key]
    const last = s?.[s.length - 1]
    if (last?.sourceRef) refs.add(last.sourceRef)
  }
  const out: NonNullable<TownOverview['sources']> = []
  for (const ref of refs) {
    const src = resolveSource(stateData, ref)
    if (src) {
      out.push({
        name: src.publisher,
        url: src.homepageUrl,
        retrieved: new Date().toISOString().slice(0, 10),
      })
    }
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
