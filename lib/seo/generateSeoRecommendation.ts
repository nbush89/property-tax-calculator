/**
 * Deterministic title/meta suggestions from query performance + current metadata.
 */

import { getCountyBySlug, getStateData, getTownBySlugs } from '@/lib/geo'
import { getTownDisplayName } from '@/utils/locationUtils'
import { resolveTownPageOverview } from '@/lib/town-overview/resolve-page-overview'
import { auditMetadataPresentation, type MetadataPresentation } from './metadataDiagnostics'
import type { PageAggregate } from './aggregateQueryPerformance'
import type { PageMetadataBrief } from './loadPageMetadata'
import { resolveEntityPresentation } from './entityPresentation'
import type { PathToEntityMatch } from './pathToEntity'
import {
  buildTownSeoFields,
  generateTownSeoDescription,
  generateTownSeoTitle,
  resolveTownSeoTier,
  resolveTownSeoYear,
} from './townMetadata'
import type { SeoEntityType } from './types'

export type SeoRecommendationStrength = 'high' | 'medium' | 'low' | 'none'

export type SeoRecommendation = {
  suggestedTitle: string
  suggestedMeta: string
  strength: SeoRecommendationStrength
  rationale: string[]
  detectedIssues: string[]
  primaryQuery: string
}

function hasYear(text: string): boolean {
  return /\b20[12]\d\b/.test(text)
}

function strengthFromMetrics(impressions: number, ctr: number, avgPosition: number): SeoRecommendationStrength {
  const highOpp = impressions >= 100 && ctr < 0.025 && avgPosition <= 20
  if (highOpp) return 'high'
  if (impressions >= 50 && ctr < 0.04) return 'medium'
  if (impressions >= 20) return 'low'
  return 'none'
}

function aggregateToMatch(agg: PageAggregate): PathToEntityMatch | null {
  return {
    matched: true,
    normalizedPath: agg.pagePath,
    entityType: agg.entityType as SeoEntityType,
    stateSlug: agg.stateSlug,
    countySlug: agg.countySlug ?? null,
    townSlug: agg.townSlug ?? null,
  }
}

type AuditCtx = {
  presentation: MetadataPresentation
  auditInput: Parameters<typeof auditMetadataPresentation>[1]
}

function buildAuditCtx(match: PathToEntityMatch, pagePath: string): AuditCtx | null {
  const pres = resolveEntityPresentation(match, pagePath)
  if (!pres) return null

  const stateData = getStateData(match.stateSlug)
  if (!stateData) return null

  const stateName = stateData.state.name
  const stateAbbrev = stateData.state.abbreviation
  const segments = pagePath.split('/').filter(Boolean)

  if (match.entityType === 'state') {
    return {
      presentation: pres,
      auditInput: {
        entityType: 'state',
        stateName,
        stateAbbrev,
        path: pagePath,
        expectYearInTitle: false,
      },
    }
  }

  if (match.entityType === 'county' && match.countySlug) {
    const county = getCountyBySlug(stateData, match.countySlug)
    return {
      presentation: pres,
      auditInput: {
        entityType: 'county',
        stateName,
        stateAbbrev,
        ...(county ? { countyName: county.name } : {}),
        path: pagePath,
        expectYearInTitle: true,
      },
    }
  }

  if (match.entityType === 'town' && match.countySlug && match.townSlug) {
    const countySeg = segments[1]
    const townSeg = segments[2]
    if (!countySeg || !townSeg) return null
    const resolved = getTownBySlugs(match.stateSlug, countySeg, townSeg)
    if (!resolved) return null
    const townDisplay = getTownDisplayName(resolved.town)
    return {
      presentation: pres,
      auditInput: {
        entityType: 'town',
        stateName,
        stateAbbrev,
        countyName: resolved.county.name,
        townDisplay,
        path: pagePath,
        expectYearInTitle: true,
      },
    }
  }

  return null
}

function applyQuerySignalsToTitle(
  title: string,
  primaryQuery: string,
  pagePath: string,
  rationale: string[]
): string {
  let t = title
  const q = primaryQuery.toLowerCase()
  const tl = t.toLowerCase()

  if (q.includes('rate') && !/\brate?s\b/i.test(tl)) {
    if (!/\|\s*rates?\b/i.test(tl)) {
      t = `${t.replace(/\s+$/, '')} | Rates`
      rationale.push('Top query mentions rates; added “| Rates” to the title for SERP alignment.')
    }
  }

  if (q.includes('calculator') && !tl.includes('calculator')) {
    if (pagePath.includes('property-tax-rates') && /\brate?s\b/i.test(tl)) {
      t = `${t.replace(/\s+$/, '')} & Calculator`
      rationale.push('Query asks for calculator on a rates-oriented path; appended calculator intent.')
    } else {
      t = t.replace(/\bEstimate\b/i, 'Calculator & Estimate')
      if (!t.toLowerCase().includes('calculator')) {
        t = `${t.replace(/\s+$/, '')} | Calculator`
      }
      rationale.push('Top query mentions calculator; reinforced calculator wording in the title.')
    }
  }

  return t
}

function ensureAbbrevInTitle(title: string, abbrev: string, rationale: string[]): string {
  if (!abbrev) return title
  if (title.toLowerCase().includes(abbrev.toLowerCase())) return title
  const t = `${abbrev} — ${title}`
  rationale.push(`Title did not include state abbreviation (${abbrev}); prepended for clarity.`)
  return t
}

function ensureYearInTitle(title: string, year: number, rationale: string[]): string {
  if (hasYear(title)) return title
  const t = `${title.replace(/\s+$/, '')} (${year})`
  rationale.push(`Title had no data year; appended (${year}) for freshness/consistency with live templates.`)
  return t
}

function buildTownSuggestion(
  match: PathToEntityMatch,
  pagePath: string,
  primaryQuery: string,
  current: PageMetadataBrief,
  rationale: string[]
): { title: string; description: string } {
  const segments = pagePath.split('/').filter(Boolean)
  const countySeg = segments[1]
  const townSeg = segments[2]
  if (!countySeg || !townSeg) {
    rationale.push('Could not parse town segments; kept current metadata.')
    return { title: current.title, description: current.description }
  }

  const resolved = getTownBySlugs(match.stateSlug, countySeg, townSeg)
  if (!resolved) {
    rationale.push('Town data not found for path; kept current metadata.')
    return { title: current.title, description: current.description }
  }

  const { town, county } = resolved
  const stateData = getStateData(match.stateSlug)!
  const overview = resolveTownPageOverview(town, county, stateData)
  const tier = resolveTownSeoTier(town)
  const year = resolveTownSeoYear({
    town,
    county,
    stateData,
    overview,
  })
  const townDisplayName = getTownDisplayName(town)
  const abbrev = stateData.state.abbreviation

  let title = generateTownSeoTitle({
    tier,
    townDisplayName,
    stateAbbrev: abbrev,
    year,
    county,
  })
  let description = generateTownSeoDescription({
    tier,
    townDisplayName,
    stateName: stateData.state.name,
    county,
  })

  rationale.push('Baseline title/description regenerated via generateTownSeoTitle / generateTownSeoDescription (tier + year from data).')

  title = applyQuerySignalsToTitle(title, primaryQuery, pagePath, rationale)
  title = ensureAbbrevInTitle(title, abbrev, rationale)
  title = ensureYearInTitle(title, year, rationale)

  const q = primaryQuery.toLowerCase()
  if (
    (primaryQuery && (q.includes('rate') || q.includes('calculator'))) &&
    (description.length < 100 || !description.toLowerCase().includes('calculat'))
  ) {
    description = buildTownSeoFields({ town, county, stateData, overview }).description
    if (q.includes('rate')) {
      description = `${description.replace(/\.\s*$/, '')}. Compare published rates and run estimates for your home value.`
    }
    rationale.push('Meta refreshed from generateTownSeoDescription and expanded with a stronger CTA for query intent.')
  } else if (description.length < 90) {
    description = `${description.replace(/\.\s*$/, '')}. Use the calculator to estimate annual property taxes from public data.`
    rationale.push('Meta was short or weak on action verbs; extended with calculator CTA.')
  }

  return { title, description }
}

/**
 * Produce SEO recommendation for one aggregated page.
 */
export function generateSeoRecommendation(
  aggregate: PageAggregate,
  current: PageMetadataBrief | null
): SeoRecommendation {
  const rationale: string[] = []
  const primaryQuery = aggregate.topQueries[0]?.query ?? ''
  const strength = strengthFromMetrics(aggregate.impressions, aggregate.ctr, aggregate.avgPosition)

  const match = aggregateToMatch(aggregate)
  if (!match || !current) {
    return {
      suggestedTitle: current?.title ?? '',
      suggestedMeta: current?.description ?? '',
      strength,
      rationale: [
        ...(current ? [] : ['No resolved metadata for this path (unknown entity or missing presentation).']),
      ],
      detectedIssues: current ? [] : ['Missing title/description resolution'],
      primaryQuery,
    }
  }

  const auditCtx = buildAuditCtx(match, aggregate.pagePath)
  const diagnostics = auditCtx
    ? auditMetadataPresentation(auditCtx.presentation, auditCtx.auditInput)
    : []
  const detectedIssues = diagnostics.map(d => `[${d.severity}] ${d.code}: ${d.message}`)

  let suggestedTitle = current.title
  let suggestedMeta = current.description

  if (match.entityType === 'town') {
    const townSuggestion = buildTownSuggestion(match, aggregate.pagePath, primaryQuery, current, rationale)
    suggestedTitle = townSuggestion.title
    suggestedMeta = townSuggestion.description
  } else {
    rationale.push('Non-town route: starting from resolveEntityPresentation copy, then applying query/year/abbrev rules.')
    const stateData = getStateData(match.stateSlug)
    const year = stateData?.state.asOfYear ?? new Date().getFullYear()
    const abbrev = stateData?.state.abbreviation ?? ''

    suggestedTitle = applyQuerySignalsToTitle(suggestedTitle, primaryQuery, aggregate.pagePath, rationale)
    if (abbrev) suggestedTitle = ensureAbbrevInTitle(suggestedTitle, abbrev, rationale)
    suggestedTitle = ensureYearInTitle(suggestedTitle, year, rationale)

    const q = primaryQuery.toLowerCase()
    if (
      !suggestedMeta.trim() ||
      suggestedMeta.length < 80 ||
      diagnostics.some(d => d.code === 'META_ACTION_WEAK' || d.code === 'META_LOCALITY_WEAK')
    ) {
      const stateName = stateData?.state.name ?? match.stateSlug
      suggestedMeta = `Plan ${stateName} property taxes: explore counties and towns, view rates, and run calculator estimates from public data. Free planning tool.`
      rationale.push('Meta missing or generic vs. query signals; applied state-level planning template.')
    } else if (q.includes('rate') && !suggestedMeta.toLowerCase().includes('rate')) {
      suggestedMeta = `${suggestedMeta.replace(/\.\s*$/, '')}. Includes current rate context where published in source data.`
      rationale.push('Query mentions rates; meta now references rates explicitly.')
    } else if (q.includes('calculator') && !suggestedMeta.toLowerCase().includes('calculat')) {
      suggestedMeta = `${suggestedMeta.replace(/\.\s*$/, '')}. Use the property tax calculator for a quick estimate.`
      rationale.push('Query mentions calculator; meta now highlights calculator CTA.')
    }
  }

  if (strength === 'high') {
    rationale.unshift(
      'High opportunity: impressions ≥ 100, CTR < 2.5%, average position ≤ 20 — prioritize these SERP tweaks.',
    )
  }

  return {
    suggestedTitle,
    suggestedMeta,
    strength,
    rationale,
    detectedIssues,
    primaryQuery,
  }
}
