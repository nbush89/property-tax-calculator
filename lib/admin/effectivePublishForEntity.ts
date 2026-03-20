/**
 * Future sitemap / browse gating: single entity resolution (validator + persisted override).
 * Server-only; call from generateStaticParams, sitemap builders, or API routes.
 */

import { getPublishOverrideForEntity } from './publishOverrideStore'
import {
  validateTownPublishReadiness,
  validateCountyPublishReadiness,
  validateStatePublishReadiness,
} from '@/lib/publishReadiness'
import type { PublishDecision } from '@/lib/publishReadiness/types'
import { resolveEffectivePublishStatus, type EffectivePublishResolution } from '@/lib/publishReadiness/effectivePublishStatus'
import { getStateData } from '@/lib/geo'
import { assertAdminSession } from './assertAdminSession'

export type EffectivePublishForEntityParams =
  | { entityType: 'town'; stateSlug: string; countySlug: string; townSlug: string }
  | { entityType: 'county'; stateSlug: string; countySlug: string }
  | { entityType: 'state'; stateSlug: string }

/**
 * Resolve validator + override merge. Does not require admin session (safe for build/sitemap).
 * For mutations, callers still use assertAdminSession in actions.
 */
export async function getEffectivePublishResolution(
  params: EffectivePublishForEntityParams
): Promise<EffectivePublishResolution> {
  const stateData = getStateData(params.stateSlug)
  let decision: PublishDecision = 'hold'

  if (params.entityType === 'state') {
    decision = validateStatePublishReadiness({ stateSlug: params.stateSlug }).decision
  } else if (params.entityType === 'county' && stateData) {
    decision = validateCountyPublishReadiness({
      stateSlug: params.stateSlug,
      countySlug: params.countySlug,
      stateData,
    }).decision
  } else if (params.entityType === 'town' && stateData) {
    decision = validateTownPublishReadiness({
      stateSlug: params.stateSlug,
      countySlug: params.countySlug,
      townSlug: params.townSlug,
      stateData,
    }).decision
  }

  const ov = await getPublishOverrideForEntity({
    entityType: params.entityType,
    stateSlug: params.stateSlug,
    countySlug: params.entityType !== 'state' ? params.countySlug : null,
    townSlug: params.entityType === 'town' ? params.townSlug : null,
  })

  return {
    ...resolveEffectivePublishStatus(decision, ov?.overrideStatus ?? 'use_validator'),
  }
}

/** Use in server actions that must be admin-only. */
export async function getEffectivePublishResolutionAsAdmin(
  params: EffectivePublishForEntityParams
): Promise<EffectivePublishResolution> {
  await assertAdminSession()
  return getEffectivePublishResolution(params)
}
