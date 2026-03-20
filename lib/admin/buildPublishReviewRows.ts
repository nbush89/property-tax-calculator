/**
 * Build merged review rows: validator + persisted overrides (server-only).
 */

import { getAvailableStates, getStateData } from '@/lib/geo'
import { getTownSlug } from '@/lib/links/towns'
import { isTownPublished } from '@/lib/town/isTownPublished'
import { slugifyLocation } from '@/utils/locationUtils'
import {
  validateStatePublishReadiness,
  validateCountyPublishReadiness,
  validateTownPublishReadiness,
} from '@/lib/publishReadiness'
import type { PublishReadinessResult, ValidationIssue } from '@/lib/publishReadiness'
import { resolveEffectivePublishStatus, type EffectivePublishStatus } from '@/lib/publishReadiness/effectivePublishStatus'
import type { PublishEntityType, PublishOverrideRecord } from './publishOverrideTypes'
import { publishOverrideEntityKey } from './publishOverrideTypes'
import { listPublishOverrides } from './publishOverrideStore'

export type PublishReviewRow = {
  rowKey: string
  entityLabel: string
  entityType: PublishEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  canonicalPath: string | undefined
  validatorDecision: PublishReadinessResult['decision']
  score: number
  effectiveStatus: EffectivePublishStatus
  manualOverrideActive: boolean
  overrideStatus: PublishOverrideRecord['overrideStatus'] | 'use_validator'
  overrideId: string | null
  reason: string | null
  notes: string | null
  warningsCount: number
  errorsCount: number
  strongPage: boolean
  issues: ValidationIssue[]
  sections: PublishReadinessResult['sections']
  metrics: PublishReadinessResult['metrics']
  lastReviewedAt: string | null
  validator: PublishReadinessResult
}

function mergeRow(
  validator: PublishReadinessResult,
  entityType: PublishEntityType,
  stateSlug: string,
  countySlug: string | null,
  townSlug: string | null,
  overrideMap: Map<string, PublishOverrideRecord>
): PublishReviewRow {
  const rowKey = publishOverrideEntityKey({ entityType, stateSlug, countySlug, townSlug })
  const ov = overrideMap.get(rowKey)
  const overrideStatus = ov?.overrideStatus ?? 'use_validator'
  const { effectiveStatus, manualOverrideActive } = resolveEffectivePublishStatus(
    validator.decision,
    overrideStatus
  )

  return {
    rowKey,
    entityLabel: validator.entityLabel,
    entityType,
    stateSlug,
    countySlug,
    townSlug,
    canonicalPath: validator.canonicalPath,
    validatorDecision: validator.decision,
    score: validator.score,
    effectiveStatus,
    manualOverrideActive,
    overrideStatus,
    overrideId: ov?.id ?? null,
    reason: ov?.reason ?? null,
    notes: ov?.notes ?? null,
    warningsCount: validator.issues.filter(i => i.severity === 'warning').length,
    errorsCount: validator.issues.filter(i => i.severity === 'error').length,
    strongPage: validator.strongPage,
    issues: validator.issues,
    sections: validator.sections,
    metrics: validator.metrics,
    lastReviewedAt: ov?.updatedAt ?? null,
    validator,
  }
}

/**
 * Load all review rows for registered states (live validation).
 */
export async function buildPublishReviewRows(): Promise<PublishReviewRow[]> {
  const overrides = await listPublishOverrides()
  const overrideMap = new Map(overrides.map(o => [publishOverrideEntityKey(o), o]))

  const rows: PublishReviewRow[] = []
  const states = getAvailableStates()

  for (const { slug: stateSlug } of states) {
    const stateData = getStateData(stateSlug)
    if (!stateData) continue

    rows.push(
      mergeRow(
        validateStatePublishReadiness({ stateSlug }),
        'state',
        stateSlug,
        null,
        null,
        overrideMap
      )
    )

    for (const county of stateData.counties ?? []) {
      const cSlug = county.slug || slugifyLocation(county.name)
      rows.push(
        mergeRow(
          validateCountyPublishReadiness({ stateSlug, countySlug: cSlug, stateData }),
          'county',
          stateSlug,
          cSlug,
          null,
          overrideMap
        )
      )

      for (const town of county.towns ?? []) {
        if (!getTownSlug(town) || !isTownPublished(town)) continue
        const tSlug = getTownSlug(town)!
        rows.push(
          mergeRow(
            validateTownPublishReadiness({
              stateSlug,
              countySlug: cSlug,
              townSlug: tSlug,
              stateData,
            }),
            'town',
            stateSlug,
            cSlug,
            tSlug,
            overrideMap
          )
        )
      }
    }
  }

  return rows
}
