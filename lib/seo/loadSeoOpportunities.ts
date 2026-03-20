/**
 * Aggregate snapshots + reviews + publish resolution + metadata diagnostics for admin table.
 */

import { getEffectivePublishResolution } from '@/lib/admin/effectivePublishForEntity'
import { getCountyBySlug, getStateData, getTownBySlugs } from '@/lib/geo'
import {
  isEffectivelyPublished,
  type EffectivePublishStatus,
} from '@/lib/publishReadiness/effectivePublishStatus'
import type { PublishDecision } from '@/lib/publishReadiness/types'
import { getTownDisplayName } from '@/utils/locationUtils'
import { entityLabelFromMatch, resolveEntityPresentation } from './entityPresentation'
import { computeCtrOpportunity } from './ctrOpportunity'
import { auditMetadataPresentation, summarizeDiagnostics, type MetadataDiagnostic } from './metadataDiagnostics'
import { latestSnapshotByPath, listSearchPerformanceSnapshots } from './searchPerformanceStore'
import { listSeoOptimizationReviews, seoReviewKey } from './seoReviewStore'
import type { PathToEntityMatch } from './pathToEntity'
import type { SeoEntityType, SeoReviewStatus } from './types'

export type SeoOpportunityRow = {
  pagePath: string
  entityType: SeoEntityType
  entityLabel: string
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  impressions: number
  clicks: number
  ctr: number
  averagePosition: number
  opportunityLevel: ReturnType<typeof computeCtrOpportunity>['level']
  priorityScore: number
  opportunityReasons: string[]
  effectivePublished: boolean
  effectiveStatus: EffectivePublishStatus
  validatorDecision: PublishDecision
  manualOverrideActive: boolean
  reviewStatus: SeoReviewStatus
  reviewNotes: string | null
  lastReviewedAt: string | null
  metadataIssueCount: number
  metadataSummary: string
  titlePreview: string
  descriptionPreview: string
  h1Preview: string | null
  diagnostics: MetadataDiagnostic[]
  importedAt: string
  sourceDateStart: string | null
  sourceDateEnd: string | null
  topQueriesJson: unknown
}

function matchFromSnapshot(s: {
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
}): PathToEntityMatch {
  return {
    matched: true,
    normalizedPath: '',
    entityType: s.entityType,
    stateSlug: s.stateSlug,
    countySlug: s.countySlug,
    townSlug: s.townSlug,
  }
}

async function effectivePublishForSnapshot(s: {
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
}): Promise<{
  effectivePublished: boolean
  effectiveStatus: EffectivePublishStatus
  validatorDecision: PublishDecision
  manualOverrideActive: boolean
}> {
  try {
    if (s.entityType === 'state') {
      const r = await getEffectivePublishResolution({ entityType: 'state', stateSlug: s.stateSlug })
      return {
        effectivePublished: isEffectivelyPublished(r),
        effectiveStatus: r.effectiveStatus,
        validatorDecision: r.validatorDecision,
        manualOverrideActive: r.manualOverrideActive,
      }
    }
    if (s.entityType === 'county' && s.countySlug) {
      const r = await getEffectivePublishResolution({
        entityType: 'county',
        stateSlug: s.stateSlug,
        countySlug: s.countySlug,
      })
      return {
        effectivePublished: isEffectivelyPublished(r),
        effectiveStatus: r.effectiveStatus,
        validatorDecision: r.validatorDecision,
        manualOverrideActive: r.manualOverrideActive,
      }
    }
    if (s.entityType === 'town' && s.countySlug && s.townSlug) {
      const r = await getEffectivePublishResolution({
        entityType: 'town',
        stateSlug: s.stateSlug,
        countySlug: s.countySlug,
        townSlug: s.townSlug,
      })
      return {
        effectivePublished: isEffectivelyPublished(r),
        effectiveStatus: r.effectiveStatus,
        validatorDecision: r.validatorDecision,
        manualOverrideActive: r.manualOverrideActive,
      }
    }
  } catch {
    /* fall through */
  }
  return {
    effectivePublished: false,
    effectiveStatus: 'hold',
    validatorDecision: 'hold',
    manualOverrideActive: false,
  }
}

export async function loadSeoOpportunityRows(): Promise<SeoOpportunityRow[]> {
  const snapshots = await listSearchPerformanceSnapshots()
  const latest = latestSnapshotByPath(snapshots)
  const reviews = await listSeoOptimizationReviews()
  const reviewByPath = new Map(reviews.map(r => [seoReviewKey(r.pagePath), r]))

  const rows: SeoOpportunityRow[] = []

  for (const snap of latest.values()) {
    const path = snap.pagePath.toLowerCase()
    const stubMatch = matchFromSnapshot(snap)
    const presentation = resolveEntityPresentation(stubMatch, path)
    const label = entityLabelFromMatch(stubMatch, path)

    const stateData = getStateData(snap.stateSlug)
    const stateName = stateData?.state.name ?? snap.stateSlug
    const abbrev = stateData?.state.abbreviation ?? snap.stateSlug.slice(0, 2).toUpperCase()
    let countyName: string | undefined
    let townDisplay: string | undefined
    if (snap.countySlug && stateData) {
      const c = getCountyBySlug(stateData, snap.countySlug)
      countyName = c?.name
    }
    if (snap.townSlug && stateData && snap.countySlug) {
      const countySeg = path.split('/').filter(Boolean)[1]
      const townSeg = path.split('/').filter(Boolean)[2]
      if (countySeg && townSeg) {
        const t = getTownBySlugs(snap.stateSlug, countySeg, townSeg)
        if (t) townDisplay = getTownDisplayName(t.town)
      }
    }

    const emptyPresentation = { title: '', description: '', h1: null as string | null }
    const pres = presentation ?? emptyPresentation

    const diagnostics = presentation
      ? auditMetadataPresentation(presentation, {
          entityType: snap.entityType,
          stateName,
          stateAbbrev: abbrev,
          countyName,
          townDisplay,
          path: snap.pagePath,
          expectYearInTitle: snap.entityType === 'town' || snap.entityType === 'county',
        })
      : [
          {
            code: 'PRESENTATION_UNRESOLVED',
            severity: 'warning' as const,
            message: 'Could not resolve title/meta from entity data (path or data mismatch)',
            recommendation: 'Verify path matches a live route and state JSON has the entity.',
          },
        ]

    const publish = await effectivePublishForSnapshot(snap)
    const opp = computeCtrOpportunity({
      impressions: snap.impressions,
      clicks: snap.clicks,
      ctr: snap.ctr,
      averagePosition: snap.averagePosition,
      effectivelyPublished: publish.effectivePublished,
      entityType: snap.entityType,
    })

    const rev = reviewByPath.get(seoReviewKey(path))

    rows.push({
      pagePath: snap.pagePath,
      entityType: snap.entityType,
      entityLabel: label,
      stateSlug: snap.stateSlug,
      countySlug: snap.countySlug,
      townSlug: snap.townSlug,
      impressions: snap.impressions,
      clicks: snap.clicks,
      ctr: snap.ctr,
      averagePosition: snap.averagePosition,
      opportunityLevel: opp.level,
      priorityScore: opp.priorityScore,
      opportunityReasons: opp.reasons,
      effectivePublished: publish.effectivePublished,
      effectiveStatus: publish.effectiveStatus,
      validatorDecision: publish.validatorDecision,
      manualOverrideActive: publish.manualOverrideActive,
      reviewStatus: rev?.status ?? 'open',
      reviewNotes: rev?.notes ?? null,
      lastReviewedAt: rev?.lastReviewedAt ?? null,
      metadataIssueCount: diagnostics.length,
      metadataSummary: summarizeDiagnostics(diagnostics),
      titlePreview: pres.title,
      descriptionPreview: pres.description,
      h1Preview: pres.h1,
      diagnostics,
      importedAt: snap.importedAt,
      sourceDateStart: snap.sourceDateStart,
      sourceDateEnd: snap.sourceDateEnd,
      topQueriesJson: snap.topQueriesJson,
    })
  }

  return rows
}
