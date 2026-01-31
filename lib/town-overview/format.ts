/**
 * Formatting helpers for Town Overview UI and summary text.
 */

import type { TownOverview } from './types'

/** Format number as USD (reuse site convention) */
export function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

/** Format percentage (e.g. 1.85 -> "1.85%") */
export function formatPct(n: number): string {
  return `${Number(n).toFixed(2)}%`
}

export type ComparisonLabel = 'higher' | 'lower' | 'similar' | 'about_the_same'

/** Human-readable comparison label (title case for standalone use) */
export function formatComparison(label: ComparisonLabel): string {
  switch (label) {
    case 'higher':
      return 'Higher than'
    case 'lower':
      return 'Lower than'
    case 'similar':
    case 'about_the_same':
      return 'Similar to'
    default:
      return 'Similar to'
  }
}

/** Lowercase comparison phrase for use in a sentence */
export function comparisonInSentence(label: ComparisonLabel): string {
  switch (label) {
    case 'higher':
      return 'higher than'
    case 'lower':
      return 'lower than'
    case 'similar':
    case 'about_the_same':
      return 'similar to'
    default:
      return 'similar to'
  }
}

/** One-word comparison for bullet values: "Higher", "Lower", "Similar" */
export function comparisonShort(label: ComparisonLabel): string {
  switch (label) {
    case 'higher':
      return 'Higher'
    case 'lower':
      return 'Lower'
    case 'similar':
    case 'about_the_same':
    default:
      return 'Similar'
  }
}

export interface BuildSummaryArgs {
  townName: string
  countyName: string
  overview: TownOverview
}

/**
 * Build a short data-driven summary paragraph (1–2 sentences).
 * References real stats when present; fallback is a short generic sentence.
 */
function isMeaningfulComparison(v: string | undefined): boolean {
  return v === 'higher' || v === 'lower'
}

export function buildTownOverviewSummary(args: BuildSummaryArgs): string {
  const { townName, countyName, overview } = args
  const comparisons = overview.comparisons
  const vsCounty = overview.vsCounty ?? comparisons?.vsCounty
  const vsState = overview.vsState ?? comparisons?.vsState
  const trendPct = overview.trendPct ?? overview.fiveYearTrendPct ?? overview.trend5y?.pctChange
  const trendStart = overview.trendStartYear ?? overview.trend5y?.startYear
  const trendEnd = overview.trendEndYear ?? overview.trend5y?.endYear
  const {
    avgResidentialTaxBill,
    effectiveTaxRatePct,
    countyAvgTaxBill,
    countyEffectiveRatePct,
    medianHomeValue,
    typicalHomeValue,
  } = overview
  const homeValue = medianHomeValue ?? typicalHomeValue

  const billIsCountyFallback =
    avgResidentialTaxBill != null &&
    countyAvgTaxBill != null &&
    avgResidentialTaxBill === countyAvgTaxBill
  const rateIsCountyFallback =
    effectiveTaxRatePct != null &&
    countyEffectiveRatePct != null &&
    effectiveTaxRatePct === countyEffectiveRatePct
  const usingCountyFallback = billIsCountyFallback || rateIsCountyFallback

  const year = overview.asOfYear
  const parts: string[] = []

  if (usingCountyFallback && (avgResidentialTaxBill != null || effectiveTaxRatePct != null)) {
    const countyContext = `${countyName} County average`
    if (avgResidentialTaxBill != null && effectiveTaxRatePct != null) {
      parts.push(
        `The ${countyContext} residential tax bill in ${year} was ${formatUSD(avgResidentialTaxBill)} and the effective rate was ${formatPct(effectiveTaxRatePct)}.`
      )
    } else if (avgResidentialTaxBill != null) {
      parts.push(
        `The ${countyContext} residential tax bill in ${year} was ${formatUSD(avgResidentialTaxBill)}.`
      )
    } else if (effectiveTaxRatePct != null) {
      parts.push(
        `The ${countyContext} effective tax rate in ${year} was ${formatPct(effectiveTaxRatePct)}.`
      )
    }
  } else {
    // Interpretive summary: comparison and trend, no restating bullet numbers
    const hasHigher = vsCounty === 'higher' || vsState === 'higher'
    const hasLower = vsCounty === 'lower' || vsState === 'lower'
    const hasSimilar =
      vsCounty === 'about_the_same' ||
      vsCounty === 'similar' ||
      vsState === 'about_the_same' ||
      vsState === 'similar'
    if (hasHigher || hasLower) {
      const dir = hasHigher ? 'higher' : 'lower'
      if (isMeaningfulComparison(vsCounty) && isMeaningfulComparison(vsState)) {
        parts.push(
          `In ${year}, ${townName} homeowners paid relatively ${dir} property taxes compared to both ${countyName} County and state averages.`
        )
      } else if (isMeaningfulComparison(vsCounty)) {
        parts.push(
          `In ${year}, ${townName} homeowners paid relatively ${dir} property taxes compared to the ${countyName} County average.`
        )
      } else if (isMeaningfulComparison(vsState)) {
        parts.push(
          `In ${year}, ${townName} homeowners paid relatively ${dir} property taxes compared to the state average.`
        )
      }
    } else if (hasSimilar || vsCounty != null || vsState != null) {
      parts.push(
        `In ${year}, ${townName} property taxes were in line with county and state averages.`
      )
    }

    if (homeValue != null) {
      parts.push('While home values in the area remain modest.')
    }

    if (trendPct != null && trendStart != null && trendEnd != null) {
      const span = trendEnd - trendStart + 1
      const absPct = Math.abs(trendPct)
      if (trendPct > 0.1) {
        parts.push(
          `Tax levels have risen steadily since ${trendStart}, increasing by roughly ${absPct.toFixed(1)}% over ${span} years.`
        )
      } else if (trendPct < -0.1) {
        parts.push(
          `Tax levels have fallen since ${trendStart}, decreasing by roughly ${absPct.toFixed(1)}% over ${span} years.`
        )
      }
    }
  }

  if (parts.length === 0) {
    return `Planning estimates for ${townName}, ${countyName} County are based on the most recent data (${year}). Verify with your local assessor.`
  }

  return parts.join(' ')
}
