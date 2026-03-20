/**
 * Merge validator output with editorial overrides for gating and admin UI.
 * Overrides never mutate raw state JSON — only this layer + persisted admin store.
 */

import type { PublishDecision } from './types'

/** Manual editorial override (persisted separately from validator). */
export type OverrideStatus = 'use_validator' | 'publish' | 'hold' | 'review'

/**
 * What actually ships / gets listed after applying overrides.
 * `review` is a queue state (do not treat as publish until resolved).
 */
export type EffectivePublishStatus = PublishDecision | 'review'

export type EffectivePublishResolution = {
  effectiveStatus: EffectivePublishStatus
  /** True when override is anything other than use_validator */
  manualOverrideActive: boolean
  /** Raw validator decision (always from last run) */
  validatorDecision: PublishDecision
}

/**
 * Resolve effective publish status for sitemap and admin badges.
 */
export function resolveEffectivePublishStatus(
  validatorDecision: PublishDecision,
  overrideStatus: OverrideStatus
): EffectivePublishResolution {
  if (overrideStatus === 'use_validator') {
    return {
      effectiveStatus: validatorDecision,
      manualOverrideActive: false,
      validatorDecision,
    }
  }

  if (overrideStatus === 'review') {
    return {
      effectiveStatus: 'review',
      manualOverrideActive: true,
      validatorDecision,
    }
  }

  // publish | hold — map to effective (editorial force)
  if (overrideStatus === 'publish') {
    return {
      effectiveStatus: 'publish',
      manualOverrideActive: true,
      validatorDecision,
    }
  }

  return {
    effectiveStatus: 'hold',
    manualOverrideActive: true,
    validatorDecision,
  }
}

/** For future gating: should this URL appear in public sitemap/browse? */
export function isEffectivelyPublished(resolution: EffectivePublishResolution): boolean {
  return resolution.effectiveStatus === 'publish' || resolution.effectiveStatus === 'publish_with_warnings'
}
