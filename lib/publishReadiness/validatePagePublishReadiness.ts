/**
 * Dispatcher: validate state, county, or town readiness from a single entry point.
 */

import type { PublishPageTarget, PublishReadinessResult } from './types'
import { validateTownPublishReadiness } from './validateTownPublishReadiness'
import { validateCountyPublishReadiness } from './validateCountyPublishReadiness'
import { validateStatePublishReadiness } from './validateStatePublishReadiness'

export function validatePagePublishReadiness(target: PublishPageTarget): PublishReadinessResult {
  switch (target.entityType) {
    case 'town':
      return validateTownPublishReadiness({
        stateSlug: target.stateSlug,
        countySlug: target.countySlug,
        townSlug: target.townSlug,
      })
    case 'county':
      return validateCountyPublishReadiness({
        stateSlug: target.stateSlug,
        countySlug: target.countySlug,
      })
    case 'state':
      return validateStatePublishReadiness({ stateSlug: target.stateSlug })
  }
}
