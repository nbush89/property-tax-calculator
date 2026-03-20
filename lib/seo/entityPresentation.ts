/**
 * Resolve title/description/H1 as close as possible to live `generateMetadata` + hero patterns.
 * Used for admin SEO diagnostics only (not for serving HTML).
 */

import { getCountyBySlug, getStateData, getTownBySlugs } from '@/lib/geo'
import { getTownSlug } from '@/lib/links/towns'
import {
  formatResolvedMetricValue,
  formatResolvedMetricYear,
  getCountyHeroHighlight,
} from '@/lib/metrics/resolveDisplayMetrics'
import { resolveTownPageOverview } from '@/lib/town-overview/resolve-page-overview'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { getTownDisplayName, slugifyLocation } from '@/utils/locationUtils'
import { formatStateName } from '@/utils/stateUtils'
import type { PathToEntityMatch } from './pathToEntity'
import type { MetadataPresentation } from './metadataDiagnostics'
import { buildTownSeoFields } from './townMetadata'

function countyDisplayFromSegment(countySegmentDecoded: string): string {
  const countySlug = countySegmentDecoded.replace(/-county-property-tax$/, '')
  return countySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Build presentation for a matched entity path.
 */
export function resolveEntityPresentation(
  match: PathToEntityMatch,
  normalizedPath: string
): MetadataPresentation | null {
  const stateData = getStateData(match.stateSlug)
  if (!stateData) return null

  const stateName = stateData.state.name
  const abbrev = stateData.state.abbreviation
  const segments = normalizedPath.split('/').filter(Boolean)

  if (match.entityType === 'state') {
    if (segments.length === 1) {
      return {
        title: `${stateName} Property Tax Calculator & County Guide (Planning Estimates)`,
        description: `Explore ${stateName} property taxes by county and town. Use public data for planning estimates and compare local tax trends.`,
        h1: `${stateName} Property Tax Overview`,
      }
    }
    if (segments[1] === 'property-tax-calculator') {
      return {
        title: `${stateName} Property Tax Calculator | Calculate Your Property Taxes`,
        description: `Calculate your ${stateName} property taxes by entering your property value, county, and municipality. Get accurate estimates with detailed breakdowns.`,
        h1: `${stateName} Property Tax Calculator`,
      }
    }
    if (segments[1] === 'property-tax-rates') {
      return {
        title: `${stateName} Property Tax Rates by County | Tax Rates`,
        description: `View current property tax rates by county and municipality in ${stateName}. Planning estimates only.`,
        h1: `${stateName} Property Tax Rates`,
      }
    }
    return null
  }

  if (match.entityType === 'county' && match.countySlug) {
    const county = getCountyBySlug(stateData, match.countySlug)
    if (!county) return null

    const countySeg = `${slugifyLocation(county.name)}-county-property-tax`
    const third = segments[2]

    if (third === 'towns') {
      const publishedCount = (county.towns || []).filter(
        t => getTownSlug(t) && isTownPublished(t)
      ).length
      return {
        title: `Property Tax Towns in ${county.name} County, ${abbrev}`,
        description: `Explore property taxes by town in ${county.name} County, ${stateName}. ${publishedCount} town pages with rates and estimates.`,
        h1: `Property tax towns in ${county.name} County, ${abbrev}`,
      }
    }

    if (third === 'property-tax-calculator') {
      const decoded = decodeURIComponent(segments[1] || countySeg)
      const countyDisplay = countyDisplayFromSegment(decoded)
      return {
        title: `${countyDisplay} County Property Tax Calculator | ${formatStateName(match.stateSlug)}`,
        description: `Calculate property taxes for ${countyDisplay} County, ${formatStateName(match.stateSlug)}. Get accurate estimates based on current tax rates.`,
        h1: `${countyDisplay} County Property Tax Calculator`,
      }
    }

    if (segments.length === 2) {
      const hero = getCountyHeroHighlight(match.stateSlug, county.metrics)
      const heroYear = hero?.latestPoint?.year
      const yearLabel = heroYear != null ? ` (${heroYear})` : ''
      const heroTitlePart = hero?.show
        ? `${hero.catalog.shortLabel ?? hero.catalog.label}${yearLabel}`
        : 'Property tax calculator'
      const heroValuePart = hero?.show ? formatResolvedMetricValue(hero) : ''

      return {
        title: `${county.name} County ${abbrev} Property Tax Calculator | ${heroTitlePart}`,
        description: `Estimate property taxes in ${county.name} County, ${stateName}.${hero?.show ? ` Includes ${hero.catalog.label.toLowerCase()}${yearLabel}: ${heroValuePart}.` : ''} Planning-focused calculator.`,
        h1: `${county.name} County, ${abbrev} Property Tax Calculator`,
      }
    }

    return null
  }

  if (match.entityType === 'town' && match.countySlug && match.townSlug) {
    const countySeg = segments[1]
    const townSeg = segments[2]
    if (!countySeg || !townSeg) return null

    const result = getTownBySlugs(match.stateSlug, countySeg, townSeg)
    if (!result) return null

    const { county, town } = result
    const pageOverview = resolveTownPageOverview(town, county, stateData)
    const seo = buildTownSeoFields({ town, county, stateData, overview: pageOverview })
    const townDisplayName = getTownDisplayName(town)

    return {
      title: seo.title,
      description: seo.description,
      h1: `${townDisplayName}, ${county.name} County ${abbrev} Property Tax Calculator`,
    }
  }

  return null
}

export function entityLabelFromMatch(match: PathToEntityMatch, normalizedPath: string): string {
  const stateData = getStateData(match.stateSlug)
  const stateName = stateData?.state.name ?? match.stateSlug
  const segments = normalizedPath.split('/').filter(Boolean)

  if (match.entityType === 'state') {
    if (segments[1] === 'property-tax-calculator') return `${stateName} — Calculator`
    if (segments[1] === 'property-tax-rates') return `${stateName} — Rates`
    return stateName
  }

  if (match.entityType === 'county' && match.countySlug) {
    const county = stateData ? getCountyBySlug(stateData, match.countySlug) : null
    const cn = county?.name ?? match.countySlug
    if (segments[2] === 'towns') return `${cn} County — Towns index`
    if (segments[2] === 'property-tax-calculator') return `${cn} County — Calculator`
    return `${cn} County, ${stateName}`
  }

  if (match.entityType === 'town' && match.townSlug && match.countySlug) {
    const countySeg = segments[1]
    const townSeg = segments[2]
    if (stateData && countySeg && townSeg) {
      const r = getTownBySlugs(match.stateSlug, countySeg, townSeg)
      if (r) return `${getTownDisplayName(r.town)}, ${r.county.name} County`
    }
    return `${match.townSlug}, ${match.countySlug}`
  }

  return normalizedPath
}
