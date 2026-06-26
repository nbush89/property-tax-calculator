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

/**
 * Metrics that can drive trend signals. medianTaxesPaid (ACS B25103, used in
 * TX/GA) counts here so non-NJ towns aren't penalized just because the field
 * name differs.
 */
const TREND_KEYS = [
  'averageResidentialTaxBill',
  'medianTaxesPaid',
  'effectiveTaxRate',
  'medianHomeValue',
] as const

function hasTownSeries(town: TownData, key: 'effectiveTaxRate' | 'averageResidentialTaxBill'): boolean {
  const s = town.metrics?.[key]
  return Boolean(s && s.length > 0)
}

/**
 * True if the town has any bill-level series — either NJ-style published
 * averageResidentialTaxBill OR ACS medianTaxesPaid (TX, GA). Treating these
 * as equivalent for tier-resolution purposes ensures TX/GA towns can reach
 * "strong" tier and surface a dollar figure in their title/description, which
 * is the single biggest CTR lever per GSC data.
 */
function hasTownBillSeries(town: TownData): boolean {
  return (
    (town.metrics?.averageResidentialTaxBill?.length ?? 0) > 0 ||
    (town.metrics?.medianTaxesPaid?.length ?? 0) > 0
  )
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
 * Tier from town data only (not state name). Drives honest copy for towns
 * with rich data (NJ + GA + TX with ACS) vs rate-only towns.
 *
 * Rules:
 *   - strong: has a bill dollar figure AND a multi-year trend on any tracked
 *     metric. We don't require an explicit effectiveTaxRate series because GA
 *     towns don't store one (the rate is derived from medianTaxesPaid /
 *     medianHomeValue at display time, same as the rates page does). The
 *     "strong" copy promises a dollar figure + trend, both of which we have.
 *   - medium: has either a rate OR a bill but not enough trend depth.
 *   - sparse: nothing reliable to lead with.
 */
export function resolveTownSeoTier(town: TownData): TownSeoTier {
  const hasRate = hasTownSeries(town, 'effectiveTaxRate')
  const hasBill = hasTownBillSeries(town)
  const trend = hasTownUsableTrend(town)

  if (hasBill && trend) return 'strong'
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
  switch (input.tier) {
    case 'strong':
      return `${townDisplayName}, ${stateAbbrev} Property Tax: ${year} Rate, Trends & Appeal Guide`
    case 'medium':
      return `${townDisplayName}, ${stateAbbrev} Property Tax Rate (${year}) | Calculator & Trends`
    default:
      return `${townDisplayName}, ${stateAbbrev} Property Tax Estimate (${year}) | ${formatCountySeoPhrase(input.county)}`
  }
}

export function generateTownSeoDescription(input: {
  tier: TownSeoTier
  townDisplayName: string
  stateName: string
  county: CountyData
  /** Bill figure in USD — included in description when present */
  avgTaxBill?: number | null
  /** Tax year the bill figure is from — shown in parens when present */
  avgTaxBillYear?: number | null
  /**
   * What kind of bill the figure represents. NJ publishes a true "average" via
   * the Division of Taxation; TX/GA come from ACS B25103 (a median). Labeling
   * matters: "Median" is more honest when that's the underlying metric, and
   * doesn't hurt CTR — the leading dollar number does the work either way.
   */
  billMetricKind?: 'avg' | 'median'
}): string {
  const { townDisplayName, stateName, county, avgTaxBill, avgTaxBillYear } = input
  const countyPhrase = formatCountySeoPhrase(county)
  const billLabel = input.billMetricKind === 'median' ? 'Median' : 'Avg'

  switch (input.tier) {
    case 'strong': {
      if (avgTaxBill != null && avgTaxBill > 0) {
        const formatted = `$${Math.round(avgTaxBill).toLocaleString('en-US')}`
        const yearSuffix = avgTaxBillYear ? ` (${avgTaxBillYear})` : ''
        return `${billLabel} property tax in ${townDisplayName}, ${stateName}: ${formatted}/yr${yearSuffix}. Use our ${countyPhrase} calculator to estimate your bill and compare rates with nearby towns.`
      }
      return `Estimate property taxes in ${townDisplayName}, ${stateName}. Use the latest ${countyPhrase} data including average tax bills and rates. Calculate your annual property taxes instantly.`
    }
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
  // Prefer NJ-style published averageResidentialTaxBill when present, fall back
  // to ACS medianTaxesPaid (TX, GA). Either is enough to label the description
  // with a concrete dollar figure — which is the main CTR driver. Track which
  // source we used so the description can label it as "Avg" or "Median"
  // honestly.
  const avgBill = getMetricLatest({
    town: input.town,
    county: input.county,
    metricKey: 'averageResidentialTaxBill',
  })
  const medianBill =
    avgBill == null
      ? getMetricLatest({
          town: input.town,
          county: input.county,
          metricKey: 'medianTaxesPaid',
        })
      : null
  const taxBill = avgBill ?? medianBill
  const billMetricKind: 'avg' | 'median' = avgBill != null ? 'avg' : 'median'
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
    avgTaxBill: taxBill?.value ?? null,
    avgTaxBillYear: taxBill?.year ?? null,
    billMetricKind,
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
