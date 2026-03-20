/**
 * Centralized town-page SEO: tiered titles and descriptions from real metrics (no per-town JSON, no state hacks).
 * Use in generateMetadata, JSON-LD snippets, and admin SEO diagnostics.
 */

import type { Metadata } from 'next'
import type { TownData, CountyData, StateData } from '@/lib/data/types'
import type { TownOverview } from '@/lib/town-overview/types'
import { getMetricLatest } from '@/lib/data/town-helpers'
import { getTownDisplayName } from '@/utils/locationUtils'
import { buildMetadata } from '@/lib/seo'

export type TownSeoTier = 'strong' | 'medium' | 'sparse'

const TREND_KEYS = ['averageResidentialTaxBill', 'effectiveTaxRate', 'medianHomeValue'] as const

function hasTownSeries(town: TownData, key: 'effectiveTaxRate' | 'averageResidentialTaxBill'): boolean {
  const s = town.metrics?.[key]
  return Boolean(s && s.length > 0)
}

/** Town-level series with enough points to show a meaningful trend. */
function hasTownUsableTrend(town: TownData): boolean {
  for (const key of TREND_KEYS) {
    const raw = town.metrics?.[key]
    if (raw && raw.length >= 3) return true
  }
  return false
}

/**
 * Tier from town data only (not state name). Drives honest copy for TX (rate-only) vs rich NJ towns.
 */
export function resolveTownSeoTier(town: TownData): TownSeoTier {
  const hasRate = hasTownSeries(town, 'effectiveTaxRate')
  const hasBill = hasTownSeries(town, 'averageResidentialTaxBill')
  const trend = hasTownUsableTrend(town)

  if (hasRate && hasBill && trend) return 'strong'
  if (hasRate || hasBill) return 'medium'
  return 'sparse'
}

export function resolveTownSeoYear(input: {
  town: TownData
  county: CountyData
  stateData: StateData
  overview: TownOverview | null
  /** Latest effective rate point year when available */
  effectiveRateYear?: number | null
}): number {
  const y =
    input.overview?.asOfYear ??
    input.effectiveRateYear ??
    input.town.asOfYear ??
    input.county.asOfYear ??
    input.stateData.state.asOfYear
  if (typeof y === 'number' && Number.isFinite(y)) return y
  return new Date().getFullYear()
}

/** "Bergen County" without duplicating County if data were ever messy */
export function formatCountySeoPhrase(county: CountyData): string {
  const n = county.name.trim()
  if (/county\s*$/i.test(n)) return n
  return `${n} County`
}

export function generateTownSeoTitle(input: {
  tier: TownSeoTier
  townDisplayName: string
  stateAbbrev: string
  year: number
  county: CountyData
}): string {
  const { townDisplayName, stateAbbrev, year } = input
  const y = `(${year})`
  switch (input.tier) {
    case 'strong':
      return `${townDisplayName}, ${stateAbbrev} Property Tax Calculator ${y} + Rates`
    case 'medium':
      return `${townDisplayName}, ${stateAbbrev} Property Tax Calculator ${y} | County Rates`
    default:
      return `${townDisplayName}, ${stateAbbrev} Property Tax Estimate ${y} | ${formatCountySeoPhrase(input.county)}`
  }
}

export function generateTownSeoDescription(input: {
  tier: TownSeoTier
  townDisplayName: string
  stateName: string
  county: CountyData
}): string {
  const { townDisplayName, stateName, county } = input
  const countyPhrase = formatCountySeoPhrase(county)

  switch (input.tier) {
    case 'strong':
      return `Estimate property taxes in ${townDisplayName}, ${stateName}. Use the latest ${countyPhrase} data including average tax bills and rates. Compare and calculate your annual property taxes instantly.`
    case 'medium':
      return `Estimate property taxes in ${townDisplayName}, ${stateName} using current ${countyPhrase} tax rates. Calculate your annual property tax and understand how local rates compare.`
    default:
      return `Estimate property taxes in ${townDisplayName}, ${stateName}. This calculator uses ${countyPhrase} averages to help you plan your annual property tax costs.`
  }
}

function buildTownKeywords(townDisplayName: string, county: CountyData, stateName: string): string {
  const c = formatCountySeoPhrase(county)
  return `${townDisplayName} property tax, ${townDisplayName} ${c} calculator, ${stateName} property tax estimate`
}

export type TownSeoFields = {
  tier: TownSeoTier
  year: number
  title: string
  description: string
  keywords: string
}

/**
 * Core SEO strings for a town page. Pass the same `overview` you use for the page body (or null).
 */
export function buildTownSeoFields(input: {
  town: TownData
  county: CountyData
  stateData: StateData
  overview: TownOverview | null
}): TownSeoFields {
  const effectiveRate = getMetricLatest({
    town: input.town,
    county: input.county,
    metricKey: 'effectiveTaxRate',
  })
  const tier = resolveTownSeoTier(input.town)
  const year = resolveTownSeoYear({
    town: input.town,
    county: input.county,
    stateData: input.stateData,
    overview: input.overview,
    effectiveRateYear: effectiveRate?.year ?? null,
  })
  const townDisplayName = getTownDisplayName(input.town)
  const stateName = input.stateData.state.name
  const abbrev = input.stateData.state.abbreviation

  const title = generateTownSeoTitle({
    tier,
    townDisplayName,
    stateAbbrev: abbrev,
    year,
    county: input.county,
  })
  const description = generateTownSeoDescription({
    tier,
    townDisplayName,
    stateName,
    county: input.county,
  })
  const keywords = buildTownKeywords(townDisplayName, input.county, stateName)

  return { tier, year, title, description, keywords }
}

/**
 * Full Next.js Metadata for town routes (canonical/OG via existing {@link buildMetadata}).
 */
export function buildTownMetadataForRoute(input: {
  town: TownData
  county: CountyData
  stateData: StateData
  overview: TownOverview | null
  stateSlug: string
  countySlugParam: string
  townSlugParam: string
}): Metadata {
  const fields = buildTownSeoFields({
    town: input.town,
    county: input.county,
    stateData: input.stateData,
    overview: input.overview,
  })
  const path = `/${encodeURIComponent(input.stateSlug)}/${encodeURIComponent(input.countySlugParam)}/${encodeURIComponent(input.townSlugParam)}`

  return buildMetadata({
    title: fields.title,
    absoluteTitle: true,
    description: fields.description,
    path,
    keywords: fields.keywords,
    openGraph: {
      title: fields.title,
      description: fields.description,
      type: 'website',
    },
  })
}
