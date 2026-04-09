/**
 * End-to-end: Search Console queries CSV → aggregates → metadata → recommendations + table rows.
 */

import { aggregateQueryPerformance } from './aggregateQueryPerformance'
import { entityLabelFromMatch } from './entityPresentation'
import { generateSeoRecommendation, type SeoRecommendationStrength } from './generateSeoRecommendation'
import {
  parseSearchConsoleQueriesCsv,
  type ImportSearchConsoleQueriesOptions,
  type QueryRow,
} from './importSearchConsoleQueries'
import { loadPageMetadata } from './loadPageMetadata'
import { pathToEntity } from './pathToEntity'
import {
  type SeoRecommendationReviewEntry,
  type SeoRecommendationReviewStatus,
  recommendationReviewKey,
} from './seoRecommendationsReviewStore'
import type { SeoEntityType } from './types'

export type SeoRecommendationTableRow = {
  pagePath: string
  entityLabel: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug?: string
  townSlug?: string
  impressions: number
  clicks: number
  ctr: number
  avgPosition: number
  topQueries: QueryRow[]
  strength: SeoRecommendationStrength
  currentTitle: string
  currentMeta: string
  suggestedTitle: string
  suggestedMeta: string
  primaryQuery: string
  rationale: string[]
  detectedIssues: string[]
  reviewStatus: SeoRecommendationReviewStatus
  notes?: string
}

export type BuildSeoRecommendationRowsResult = {
  importSummary: ReturnType<typeof parseSearchConsoleQueriesCsv>['summary']
  unmatchedPagePaths: string[]
  rows: SeoRecommendationTableRow[]
}

export function buildSeoRecommendationRowsFromCsv(
  csvText: string,
  reviewByPath: Record<string, SeoRecommendationReviewEntry>,
  importOptions?: ImportSearchConsoleQueriesOptions
): BuildSeoRecommendationRowsResult {
  const { rows: queryRows, summary: importSummary } = parseSearchConsoleQueriesCsv(csvText, importOptions)
  const { aggregates, unmatchedPagePaths } = aggregateQueryPerformance(queryRows)

  const rows: SeoRecommendationTableRow[] = []

  for (const agg of aggregates) {
    const meta = loadPageMetadata(agg.pagePath)
    const rec = generateSeoRecommendation(agg, meta)

    const entity = pathToEntity(agg.pagePath)
    const entityLabel = entity.matched
      ? entityLabelFromMatch(entity, agg.pagePath)
      : agg.pagePath

    const key = recommendationReviewKey(agg.pagePath)
    const rev = reviewByPath[key]

    rows.push({
      pagePath: agg.pagePath,
      entityLabel,
      entityType: agg.entityType,
      stateSlug: agg.stateSlug,
      countySlug: agg.countySlug,
      townSlug: agg.townSlug,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.ctr,
      avgPosition: agg.avgPosition,
      topQueries: agg.topQueries,
      strength: rec.strength,
      currentTitle: meta?.title ?? '',
      currentMeta: meta?.description ?? '',
      suggestedTitle: rec.suggestedTitle,
      suggestedMeta: rec.suggestedMeta,
      primaryQuery: rec.primaryQuery,
      rationale: rec.rationale,
      detectedIssues: rec.detectedIssues,
      reviewStatus: rev?.status ?? 'open',
      notes: rev?.notes,
    })
  }

  return { importSummary, unmatchedPagePaths, rows }
}
