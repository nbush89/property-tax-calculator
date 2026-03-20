/**
 * Sitemap / search indexing: town included only when effective publish status is “published”
 * ({@link isEffectivelyPublished}: publish or publish_with_warnings), honoring manual overrides.
 */

import type { TownData } from '@/lib/data/types'
import { getEffectivePublishResolution } from '@/lib/admin/effectivePublishForEntity'
import { isEffectivelyPublished } from '@/lib/publishReadiness/effectivePublishStatus'

export type TownIndexableArgs = {
  stateSlug: string
  /** County identity as in geo/validator (county.slug or slugify(name)) */
  countySlug: string
  /** Short town slug for routes (no -property-tax suffix) */
  townSlug: string
  town: TownData
}

/**
 * True when town should appear in sitemap.xml urlset (validator + override → effective published).
 * On unexpected errors, returns false (do not index).
 */
export async function isTownIndexable(args: TownIndexableArgs): Promise<boolean> {
  try {
    const resolution = await getEffectivePublishResolution({
      entityType: 'town',
      stateSlug: args.stateSlug,
      countySlug: args.countySlug,
      townSlug: args.townSlug,
    })
    const include = isEffectivelyPublished(resolution)

    if (process.env.SITEMAP_TOWN_DEBUG === '1') {
      console.log(
        `[sitemap town] ${args.stateSlug}/${args.countySlug}/${args.townSlug}`,
        `validator=${resolution.validatorDecision}`,
        `manualOverride=${resolution.manualOverrideActive}`,
        `effective=${resolution.effectiveStatus}`,
        `include=${include}`
      )
    }

    return include
  } catch (err) {
    if (process.env.SITEMAP_TOWN_DEBUG === '1') {
      console.warn('[sitemap town] exclude (error)', args.stateSlug, args.townSlug, err)
    }
    return false
  }
}
