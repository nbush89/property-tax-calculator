/**
 * Resolve live title/description for a canonical path using the same stack as admin SEO diagnostics.
 */

import { normalizeSitePath, pathToEntity } from './pathToEntity'
import { resolveEntityPresentation } from './entityPresentation'

export type PageMetadataBrief = {
  title: string
  description: string
}

/**
 * @returns null when path cannot be normalized or does not resolve to a known entity presentation.
 */
export function loadPageMetadata(pagePath: string): PageMetadataBrief | null {
  const norm = normalizeSitePath(pagePath)
  if (!norm) return null
  const entity = pathToEntity(norm)
  if (!entity.matched) return null
  const pres = resolveEntityPresentation(entity, norm)
  if (!pres) return null
  return { title: pres.title, description: pres.description }
}
