/**
 * Town page: generated sections (overview prose, comparison, estimate guide, trend chart model).
 * Metric choices follow capabilities via overview/town metrics — no state slug conditionals in UI.
 */

import type { TownData, CountyData, StateData } from '@/lib/data/types'
import type { TownOverview } from '@/lib/town-overview/types'
import { getStateCapabilities } from '@/lib/state-capabilities'
import { pickBestTrendSeries } from '@/lib/town-overview/trend-series'
import { METRIC_CATALOG } from '@/lib/metrics/metricCatalog'
import type { YearValue } from '@/utils/getCountySeries'

export type TownTrendChartModel = {
  series: YearValue[]
  valueFormat: 'usd' | 'percent'
  title: string
  subtitle: string
  metricKey: string
}

export type TownComparisonItem = {
  label: string
  body: string
}

export type TownPageSections = {
  overviewParagraphs: string[]
  comparison?: {
    title: string
    items: TownComparisonItem[]
    summary?: string
  }
  estimateGuide: {
    title: string
    steps: string[]
    note?: string
  }
  trendChart: TownTrendChartModel | null
  relatedTownsIntro: string
}

/**
 * State-aware label for the averageResidentialTaxBill metric.
 *
 * The field stores the combined annual property tax bill, but the underlying
 * source differs by state:
 *   - NJ: MOD IV published averages → "average residential tax bill"
 *   - TX: ACS DP04_0087E median taxes paid → "median taxes paid"
 *
 * Using the wrong term (e.g. "average" when the data is a median) is
 * technically inaccurate and can mislead users who know the difference.
 */
export function taxBillLabelForState(stateSlug: string): {
  label: string
  shortLabel: string
  sourceNote: string
} {
  if (stateSlug === 'texas') {
    return {
      label: 'median taxes paid',
      shortLabel: 'Median taxes paid',
      sourceNote: 'ACS survey median — reflects all taxing units net of typical exemptions',
    }
  }
  return {
    label: 'average residential tax bill',
    shortLabel: 'Avg residential tax bill',
    sourceNote: 'From published state tax records',
  }
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

export function buildTownOverviewParagraphs(params: {
  townDisplayName: string
  countyName: string
  stateName: string
  stateSlug: string
  overview: TownOverview
  cap: ReturnType<typeof getStateCapabilities>
}): string[] {
  const { townDisplayName, countyName, stateName, stateSlug, overview, cap } = params
  const billLabel = taxBillLabelForState(stateSlug)
  const out: string[] = []

  const bill = overview.avgResidentialTaxBill
  const rate = overview.effectiveTaxRatePct
  const billYear = overview.avgResidentialTaxBillYear ?? overview.asOfYear
  const rateYear = overview.effectiveTaxRateYear ?? overview.asOfYear

  const billMatchesCounty =
    bill != null &&
    overview.countyAvgTaxBill != null &&
    bill === overview.countyAvgTaxBill
  const rateMatchesCounty =
    rate != null &&
    overview.countyEffectiveRatePct != null &&
    rate === overview.countyEffectiveRatePct

  if (cap.hasAverageTaxBill && bill != null && !billMatchesCounty) {
    out.push(
      `The latest ${billLabel.label} we show for ${townDisplayName} is ${formatUsd(bill)} (tax year ${billYear}), from published data used on this site.`
    )
  } else if (cap.hasAverageTaxBill && bill != null && billMatchesCounty) {
    out.push(
      `Town-level ${billLabel.label} is not separately published in our dataset for ${townDisplayName}; the value shown matches the ${countyName} County figure (${formatUsd(bill)}, tax year ${billYear}).`
    )
  }

  if (rate != null) {
    const ratePrimary = cap.hasComptrollerUnitRates || !cap.hasAverageTaxBill || bill == null
    const scope = rateMatchesCounty ? `${countyName} County (published county taxing-unit rate)` : townDisplayName
    if (ratePrimary || out.length === 0) {
      out.push(
        `Effective tax rate for ${scope} is ${formatPct(rate)} (tax year ${rateYear}). Use methodology for how this rate is defined in ${stateName}.`
      )
    } else if (cap.hasAverageTaxBill && bill != null && !billMatchesCounty) {
      out.push(
        `Effective rate for ${townDisplayName} is ${formatPct(rate)} (tax year ${rateYear}).`
      )
    }
  }

  if (out.length === 0 && (bill != null || rate != null)) {
    out.push(
      `Latest figures for ${townDisplayName} in ${countyName} County, ${stateName}, are in the snapshot above. Use the calculator for planning amounts.`
    )
  }

  if (out.length === 0) {
    out.push(
      `Planning estimates for ${townDisplayName} use ${stateName} rates in our dataset and county context where town-specific series are limited. Verify with your local assessor or appraisal district.`
    )
  }

  out.push(
    `Municipal and school budgets affect what you owe; selecting this municipality in the calculator aligns the estimate with published rates we store for it.`
  )

  return out.slice(0, 3)
}

export function buildTownComparisonSection(params: {
  townDisplayName: string
  countyName: string
  stateName: string
  stateSlug: string
  overview: TownOverview
}): TownPageSections['comparison'] | undefined {
  const { townDisplayName, countyName, stateName, stateSlug, overview } = params
  const billLabel = taxBillLabelForState(stateSlug)
  const items: TownComparisonItem[] = []
  const vsCounty = overview.vsCounty ?? overview.comparisons?.vsCounty
  const vsState = overview.vsState ?? overview.comparisons?.vsState

  if (vsCounty === 'higher' || vsCounty === 'lower') {
    const metricHint =
      overview.effectiveTaxRatePct != null &&
      overview.countyEffectiveRatePct != null &&
      overview.effectiveTaxRatePct !== overview.countyEffectiveRatePct
        ? 'effective rate'
        : overview.avgResidentialTaxBill != null
          ? billLabel.label
          : 'published tax metrics'
    items.push({
      label: `vs ${countyName} County`,
      body: `${townDisplayName} is ${vsCounty === 'higher' ? 'above' : 'below'} the county comparison baseline for ${metricHint}, using the latest values in our dataset.`,
    })
  }

  if (vsState === 'higher' || vsState === 'lower') {
    items.push({
      label: `vs ${stateName}`,
      body: `${townDisplayName} is ${vsState === 'higher' ? 'above' : 'below'} the statewide comparison baseline in our data where we can compute it.`,
    })
  }

  if (items.length === 0) return undefined

  return {
    title: `How ${townDisplayName} compares`,
    items,
    summary: `Comparisons are for planning only and depend on which metrics your state publishes at town level.`,
  }
}

export function buildTownEstimateGuide(params: {
  townDisplayName: string
  countyName: string
}): TownPageSections['estimateGuide'] {
  return {
    title: `How to estimate property taxes in ${params.townDisplayName}`,
    steps: [
      `Enter your home value (or a value you want to stress-test).`,
      `Keep ${params.townDisplayName} selected in ${params.countyName} County so municipal and county rate rules match this place.`,
      `Review annual and monthly estimates, then confirm with local officials if you need an official bill.`,
    ],
    note: `Actual taxes depend on assessed or appraised taxable value, exemptions, caps, and published rates for your taxing units.`,
  }
}

export function resolveTownTrendChartModel(params: {
  town: TownData
  county: CountyData
  townDisplayName: string
  countyName: string
  stateSlug: string
}): TownTrendChartModel | null {
  const pick = pickBestTrendSeries(params.town, params.county)
  if (!pick || pick.points.length < 3) return null

  const catalog = METRIC_CATALOG[pick.metricKey]
  const valueFormat: 'usd' | 'percent' = pick.metricKey === 'effectiveTaxRate' ? 'percent' : 'usd'
  const series: YearValue[] = pick.points.map(p => ({ year: p.year, value: p.value }))

  // Use state-aware label for the tax bill metric so chart copy is accurate.
  const metricLabel =
    pick.metricKey === 'averageResidentialTaxBill'
      ? taxBillLabelForState(params.stateSlug).label
      : catalog.label.toLowerCase()

  const geo =
    pick.scope === 'town'
      ? `${params.townDisplayName} (${metricLabel})`
      : `${params.countyName} County (${metricLabel}, county context)`

  return {
    series,
    valueFormat,
    title:
      pick.scope === 'town'
        ? `Historical trend — ${params.townDisplayName}`
        : `County trend context — ${params.countyName} County`,
    subtitle: `${geo}. Planning and comparison only; definitions follow published sources.`,
    metricKey: pick.metricKey,
  }
}

export function buildTownRelatedTownsIntro(countyName: string, townDisplayName: string): string {
  return `Other municipalities in ${countyName} County — browse neighbors to compare published rates and run the same calculator with a different place selected (not a ranking; data availability varies by town).`
}

export function resolveTownPageSections(params: {
  town: TownData
  county: CountyData
  stateData: StateData
  townDisplayName: string
  overview: TownOverview | null
}): TownPageSections {
  const { county, stateData, townDisplayName, overview } = params
  const stateName = stateData.state.name
  const cap = getStateCapabilities(stateData.state.slug)

  const stateSlug = stateData.state.slug

  const overviewParagraphs =
    overview != null
      ? buildTownOverviewParagraphs({
          townDisplayName,
          countyName: county.name,
          stateName,
          stateSlug,
          overview,
          cap,
        })
      : [
          `Published metrics for ${townDisplayName} are limited in our dataset. Use the calculator with ${county.name} County context and verify locally.`,
        ]

  const comparison =
    overview != null
      ? buildTownComparisonSection({
          townDisplayName,
          countyName: county.name,
          stateName,
          stateSlug,
          overview,
        })
      : undefined

  return {
    overviewParagraphs,
    comparison,
    estimateGuide: buildTownEstimateGuide({
      townDisplayName,
      countyName: county.name,
    }),
    trendChart: resolveTownTrendChartModel({
      town: params.town,
      county,
      townDisplayName,
      countyName: county.name,
      stateSlug,
    }),
    relatedTownsIntro: buildTownRelatedTownsIntro(county.name, townDisplayName),
  }
}
