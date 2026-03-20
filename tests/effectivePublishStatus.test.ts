/**
 * Effective publish status merge (validator + override).
 */
import assert from 'node:assert/strict'
import {
  resolveEffectivePublishStatus,
  isEffectivelyPublished,
} from '@/lib/publishReadiness/effectivePublishStatus'

const vWarn = resolveEffectivePublishStatus('publish_with_warnings', 'use_validator')
assert.equal(vWarn.effectiveStatus, 'publish_with_warnings')
assert.equal(vWarn.manualOverrideActive, false)

const forceHold = resolveEffectivePublishStatus('publish', 'hold')
assert.equal(forceHold.effectiveStatus, 'hold')
assert.equal(forceHold.manualOverrideActive, true)
assert.equal(forceHold.validatorDecision, 'publish')

const review = resolveEffectivePublishStatus('hold', 'review')
assert.equal(review.effectiveStatus, 'review')
assert.ok(isEffectivelyPublished({ ...vWarn }))

console.log('[OK] effectivePublishStatus tests passed')
