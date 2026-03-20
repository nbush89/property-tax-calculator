/**
 * Data-driven county page copy: built from state/county metrics + capability metadata.
 * Do not add long-form prose to state JSON for county pages — extend builders here.
 */

import type { CountyData, StateData, TownData, MetricSeries } from '@/lib/data/types'
import { getLatestValue, getLatestYear } from '@/lib/data/metrics'
import { getMetricAvailability } from '@/lib/metrics/stateMetricCapabilities'
import { getStateCapabilities } from '@/lib/state-capabilities'
import {
  getCountyHeroHighlight,
  formatResolvedMetricValue,
  formatResolvedMetricYear,
  type ResolvedDisplayMetric,
} from '@/lib/metrics/resolveDisplayMetrics'
import { getCountyBySlug } from '@/lib/geo'
import { slugifyLocation } from '@/utils/locationUtils'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { getTownSlug } from '@/lib/links/towns'

export type CountyComparisonTone = 'neutral' | 'positive' | 'warning'

export type CountyComparisonItem = {
  label: string
  value: string
  tone?: CountyComparisonTone
}

export type CountyPageContent = {
  overview: {
    title?: string
    paragraphs: string[]
  }
  comparison?: {
    title: string
    items: CountyComparisonItem[]
    summary?: string
  }
  taxFactors: {
    title: string
    intro?: string
    bullets: string[]
  }
  estimateGuide: {
    title: string
    steps: string[]
    note?: string
  }
  townInsights?: {
    title: string
    intro?: string
    highlights: string[]
  }
  relatedCounties?: {
    title: string
    intro?: string
    counties: Array<{
      name: string
      href: string
      summary?: string
    }>
  }
}

function medianSorted(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  return medianSorted([...values].sort((a, b) => a - b))
}

/** County-level series we compare across peers (keys must exist on CountyMetrics). */
export type CountyPeerMetricKey = 'averageResidentialTaxBill' | 'effectiveTaxRate'

function countySeriesForPeerMetric(
  county: CountyData,
  metricKey: CountyPeerMetricKey
): MetricSeries | undefined {
  if (metricKey === 'averageResidentialTaxBill') {
    return county.metrics?.averageResidentialTaxBill
  }
  return county.metrics?.effectiveTaxRate
}

export function collectCountyLatestValues(
  counties: CountyData[] | undefined,
  metricKey: CountyPeerMetricKey,
  excludeCountyName?: string
): number[] {
  if (!counties?.length) return []
  const ex = excludeCountyName?.toLowerCase()
  const out: number[] = []
  for (const c of counties) {
    if (ex && c.name.toLowerCase() === ex) continue
    const v = getLatestValue(countySeriesForPeerMetric(c, metricKey))
    if (v != null && Number.isFinite(v)) out.push(v)
  }
  return out
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`
}

export function buildCountyOverview(params: {
  stateSlug: string
  stateName: string
  stateAbbrev: string
  county: CountyData
  countyHero: ResolvedDisplayMetric | null
}): CountyPageContent['overview'] {
  const { stateName, county, countyHero } = params
  const paragraphs: string[] = []

  if (countyHero?.show && countyHero.latestPoint) {
    const y = formatResolvedMetricYear(countyHero)
    const yearBit = y != null ? `Tax year ${y}. ` : ''
    const label = countyHero.catalog.label.toLowerCase()
    paragraphs.push(
      `The summary line above shows the latest published ${label} for ${county.name} County, ${stateName}. ${yearBit}It is derived from the same source linked below the overview.`
    )
  } else {
    paragraphs.push(
      `Property taxes in ${county.name} County, ${stateName} depend on published local rates and how your property is assessed. Use the calculator on this page for a planning estimate.`
    )
  }

  const townCount = (county.towns ?? []).filter(t => getTownSlug(t) && isTownPublished(t)).length
  if (townCount > 0) {
    paragraphs.push(
      `Municipalities within the county can use different tax rates, so selecting a town in the calculator—when available—can change the estimate materially.`
    )
  }

  paragraphs.push(
    `Use this page to run estimates, browse municipalities in ${county.name} County, and review trends where we have a series from the same source.`
  )

  return {
    title: `${county.name} County overview`,
    paragraphs: paragraphs.slice(0, 3),
  }
}

export function buildCountyComparisonSection(params: {
  stateSlug: string
  stateName: string
  county: CountyData
  stateData: StateData
}): CountyPageContent['comparison'] | undefined {
  const { stateSlug, stateName, county, stateData } = params
  const items: CountyComparisonItem[] = []
  const all = stateData.counties ?? []

  const billAv = getMetricAvailability(stateSlug, 'county', 'averageResidentialTaxBill')
  const billComparable = billAv?.supported && billAv.comparability !== 'low'
  const countyBill = getLatestValue(county.metrics?.averageResidentialTaxBill)

  if (billComparable && countyBill != null) {
    const peers = collectCountyLatestValues(all, 'averageResidentialTaxBill', county.name)
    if (peers.length >= 3) {
      const med = median(peers)
      if (med != null && med > 0) {
        const diff = countyBill - med
        const abs = formatUsd(Math.abs(diff))
        if (Math.abs(diff) < med * 0.02) {
          items.push({
            label: `vs typical county in ${stateName}`,
            value: `Close to the median average residential tax bill across counties in this dataset (about ${formatUsd(med)}).`,
            tone: 'neutral',
          })
        } else if (diff > 0) {
          items.push({
            label: `vs typical county in ${stateName}`,
            value: `Above the median average residential tax bill among counties in this dataset (about ${abs} higher than the ${formatUsd(med)} median).`,
            tone: 'warning',
          })
        } else {
          items.push({
            label: `vs typical county in ${stateName}`,
            value: `Below the median average residential tax bill among counties in this dataset (about ${abs} lower than the ${formatUsd(med)} median).`,
            tone: 'positive',
          })
        }
      }
    }
  }

  const rateAv = getMetricAvailability(stateSlug, 'county', 'effectiveTaxRate')
  const countyRate = getLatestValue(county.metrics?.effectiveTaxRate)
  if (rateAv?.supported && countyRate != null) {
    const peers = collectCountyLatestValues(all, 'effectiveTaxRate', county.name)
    if (peers.length >= 3) {
      const med = median(peers)
      if (med != null) {
        const diff = countyRate - med
        const semanticsNote =
          rateAv.semantics === 'state_specific'
            ? ' (same published rate definition as other counties in this state dataset)'
            : ''
        if (Math.abs(diff) < 0.005) {
          items.push({
            label: `County effective rate vs peers`,
            value: `Near the median county effective rate in this ${stateName} dataset (${formatPct(med)})${semanticsNote}.`,
            tone: 'neutral',
          })
        } else if (diff > 0) {
          items.push({
            label: `County effective rate vs peers`,
            value: `Higher than the median county effective rate in this dataset (${formatPct(countyRate)} vs ${formatPct(med)})${semanticsNote}.`,
            tone: 'neutral',
          })
        } else {
          items.push({
            label: `County effective rate vs peers`,
            value: `Lower than the median county effective rate in this dataset (${formatPct(countyRate)} vs ${formatPct(med)})${semanticsNote}.`,
            tone: 'neutral',
          })
        }
      }
    }
  }

  const neighbors = county.neighborCounties ?? []
  const neighborData = neighbors
    .map(name => getCountyBySlug(stateData, slugifyLocation(name)))
    .filter((c): c is CountyData => c != null)

  if (billComparable && countyBill != null && neighborData.length > 0) {
    const withBills = neighborData
      .map(c => ({ name: c.name, v: getLatestValue(c.metrics?.averageResidentialTaxBill) }))
      .filter((x): x is { name: string; v: number } => x.v != null)
    if (withBills.length > 0) {
      const higher = withBills.filter(x => x.v > countyBill)
      const lower = withBills.filter(x => x.v < countyBill)
      if (higher.length || lower.length) {
        const parts: string[] = []
        if (lower.length)
          parts.push(
            `Lower average bill than: ${lower.map(x => `${x.name} (${formatUsd(x.v)})`).join(', ')}`
          )
        if (higher.length)
          parts.push(
            `Higher average bill than: ${higher.map(x => `${x.name} (${formatUsd(x.v)})`).join(', ')}`
          )
        items.push({
          label: `Nearby counties (average bill)`,
          value: parts.join('. ') + '.',
          tone: 'neutral',
        })
      }
    }
  }

  if (rateAv?.supported && countyRate != null && neighborData.length > 0) {
    const withRates = neighborData
      .map(c => ({ name: c.name, v: getLatestValue(c.metrics?.effectiveTaxRate) }))
      .filter((x): x is { name: string; v: number } => x.v != null)
    if (withRates.length > 0) {
      const higher = withRates.filter(x => x.v > countyRate)
      const lower = withRates.filter(x => x.v < countyRate)
      if (higher.length || lower.length) {
        const parts: string[] = []
        if (lower.length)
          parts.push(`Lower rate than: ${lower.map(x => `${x.name} (${formatPct(x.v)})`).join(', ')}`)
        if (higher.length)
          parts.push(
            `Higher rate than: ${higher.map(x => `${x.name} (${formatPct(x.v)})`).join(', ')}`
          )
        items.push({
          label: `Nearby counties (effective rate)`,
          value: parts.join('. ') + '.',
          tone: 'neutral',
        })
      }
    }
  }

  if (items.length === 0) return undefined

  return {
    title: `How ${county.name} County compares`,
    items,
    summary: `Comparisons use the latest year available per county in our dataset and are for planning only.`,
  }
}

export function buildCountyTaxFactorsSection(params: {
  stateSlug: string
  stateName: string
  county: CountyData
}): CountyPageContent['taxFactors'] {
  const cap = getStateCapabilities(params.stateSlug)
  const { stateName, county } = params
  const bullets: string[] = [
    `Your tax bill is driven by taxable value (assessment or appraised basis, depending on ${stateName} practice) and the total rate that applies to your property.`,
    `School districts, municipalities, and county government each affect the combined burden; the mix differs by address.`,
  ]

  if (cap.hasCountyAndMunicipalRates) {
    bullets.push(
      `In ${stateName}, county and municipal rate components are modeled separately where our data supports it—see methodology for how we combine them in the calculator.`
    )
  }

  if (cap.hasComptrollerUnitRates) {
    bullets.push(
      `Published rates are often reported per taxing unit (for example, county vs city). Do not assume county and city rates from separate lines can be added without understanding which units apply to a specific property.`
    )
  }

  bullets.push(
    `Exemptions, caps, and protests can change what you owe; confirm eligibility and deadlines with your local appraisal office or tax assessor.`
  )

  return {
    title: `What affects property taxes in ${county.name} County`,
    intro: `These factors apply broadly in ${stateName}; your actual bill depends on your property and local taxing units.`,
    bullets: bullets.slice(0, 5),
  }
}

export function buildCountyEstimateGuide(params: {
  stateName: string
  county: CountyData
}): CountyPageContent['estimateGuide'] {
  return {
    title: `How to estimate your property taxes in ${params.county.name} County`,
    steps: [
      `Enter your home value (or the value you want to stress-test).`,
      `Select your municipality in ${params.county.name} County when the list is available—estimates usually get closer to your situation.`,
      `Read the annual and monthly estimate, then verify with local officials if you need an official amount.`,
    ],
    note: `Figures are for planning and comparison. Actual bills depend on assessed value, exemptions, caps, and published rates for your exact taxing units.`,
  }
}

function latestTownMetric(
  town: TownData,
  key: 'averageResidentialTaxBill' | 'effectiveTaxRate'
): { value: number; year: number | null } | null {
  const series = town.metrics?.[key]
  const v = getLatestValue(series)
  const y = getLatestYear(series)
  if (v == null || !Number.isFinite(v)) return null
  return { value: v, year: y }
}

export function buildCountyTownInsights(params: {
  stateSlug: string
  county: CountyData
}): CountyPageContent['townInsights'] | undefined {
  const { stateSlug, county } = params
  const towns = (county.towns ?? []).filter(t => getTownSlug(t) && isTownPublished(t))
  if (towns.length === 0) return undefined

  const billSupported =
    getMetricAvailability(stateSlug, 'town', 'averageResidentialTaxBill')?.supported === true
  const rateSupported =
    getMetricAvailability(stateSlug, 'town', 'effectiveTaxRate')?.supported === true

  const billRows = billSupported
    ? towns
        .map(t => {
          const m = latestTownMetric(t, 'averageResidentialTaxBill')
          return m ? { name: t.name, ...m } : null
        })
        .filter((x): x is { name: string; value: number; year: number | null } => x != null)
    : []

  const rateRows = rateSupported
    ? towns
        .map(t => {
          const m = latestTownMetric(t, 'effectiveTaxRate')
          return m ? { name: t.name, ...m } : null
        })
        .filter((x): x is { name: string; value: number; year: number | null } => x != null)
    : []

  const highlights: string[] = []
  const introParts: string[] = []

  introParts.push(
    `${towns.length} ${towns.length === 1 ? 'municipality has' : 'municipalities have'} town-level detail in this county${billRows.length + rateRows.length > 0 ? ' with at least one usable metric' : ''}.`
  )

  if (billRows.length >= 2) {
    const sorted = [...billRows].sort((a, b) => a.value - b.value)
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    const spread = high.value - low.value
    highlights.push(
      `Average residential tax bill: lowest among listed towns is ${low.name} (${formatUsd(low.value)}), highest is ${high.name} (${formatUsd(high.value)}); spread about ${formatUsd(spread)}.`
    )
  } else if (billRows.length === 1) {
    const r = billRows[0]!
    highlights.push(
      `One town in this county has average residential tax bill data in our dataset: ${r.name} (${formatUsd(r.value)}).`
    )
  }

  if (rateRows.length >= 2) {
    const sorted = [...rateRows].sort((a, b) => a.value - b.value)
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    highlights.push(
      `Published effective rate (town/city basis per state data): lowest ${low.name} (${formatPct(low.value)}), highest ${high.name} (${formatPct(high.value)}).`
    )
  } else if (rateRows.length === 1 && billRows.length === 0) {
    const r = rateRows[0]!
    highlights.push(`Published effective rate data for: ${r.name} (${formatPct(r.value)}).`)
  }

  if (highlights.length === 0 && towns.length > 0) {
    highlights.push(`Browse municipalities below for links to town-level estimates and charts where available.`)
  }

  return {
    title: `Towns in ${county.name} County`,
    intro: introParts.join(' '),
    highlights,
  }
}

export function buildRelatedCountyLinks(params: {
  stateSlug: string
  stateName: string
  county: CountyData
  stateData: StateData
}): CountyPageContent['relatedCounties'] | undefined {
  const { stateSlug, county, stateData } = params
  const hrefFor = (c: CountyData) =>
    `/${encodeURIComponent(stateSlug)}/${slugifyLocation(c.name)}-county-property-tax`

  const neighborNames = county.neighborCounties ?? []
  const fromNeighbors = neighborNames
    .map(n => getCountyBySlug(stateData, slugifyLocation(n)))
    .filter((c): c is CountyData => c != null)

  const pool: CountyData[] =
    fromNeighbors.length > 0
      ? fromNeighbors
      : (stateData.counties ?? []).filter(c => c.name !== county.name)

  const unique = new Map<string, CountyData>()
  for (const c of pool) {
    if (c.name === county.name) continue
    unique.set(c.slug ?? slugifyLocation(c.name), c)
  }

  const list = [...unique.values()].slice(0, 6)

  if (list.length === 0) return undefined

  const heroMetric = (c: CountyData) => getCountyHeroHighlight(stateSlug, c.metrics)
  const counties = list.map(c => {
    const hero = heroMetric(c)
    let summary: string | undefined
    if (hero?.show) {
      const y = formatResolvedMetricYear(hero)
      const v = formatResolvedMetricValue(hero)
      summary =
        y != null
          ? `${hero.catalog.shortLabel ?? hero.catalog.label} (${y}): ${v}`
          : `${hero.catalog.shortLabel ?? hero.catalog.label}: ${v}`
    }
    return {
      name: c.name,
      href: hrefFor(c),
      summary,
    }
  })

  return {
    title: `Compare with nearby counties`,
    intro:
      fromNeighbors.length > 0
        ? `Other counties next to or near ${county.name} County.`
        : `Other counties in ${params.stateName} from this dataset.`,
    counties,
  }
}

export function resolveCountyPageContent(params: {
  stateSlug: string
  stateData: StateData
  county: CountyData
}): { content: CountyPageContent; countyHero: ResolvedDisplayMetric | null } {
  const { stateSlug, stateData, county } = params
  const stateName = stateData.state.name
  const countyHero = getCountyHeroHighlight(stateSlug, county.metrics)

  const overview = buildCountyOverview({
    stateSlug,
    stateName,
    stateAbbrev: stateData.state.abbreviation,
    county,
    countyHero,
  })

  const comparison = buildCountyComparisonSection({
    stateSlug,
    stateName,
    county,
    stateData,
  })

  const taxFactors = buildCountyTaxFactorsSection({
    stateSlug,
    stateName,
    county,
  })

  const estimateGuide = buildCountyEstimateGuide({ stateName, county })

  const townInsights = buildCountyTownInsights({ stateSlug, county })

  const relatedCounties = buildRelatedCountyLinks({
    stateSlug,
    stateName,
    county,
    stateData,
  })

  return {
    countyHero,
    content: {
      overview,
      ...(comparison ? { comparison } : {}),
      taxFactors,
      estimateGuide,
      ...(townInsights ? { townInsights } : {}),
      ...(relatedCounties ? { relatedCounties } : {}),
    },
  }
}
