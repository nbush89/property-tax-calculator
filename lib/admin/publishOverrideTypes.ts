/**
 * Editorial publish overrides — admin metadata only, never mixed into state JSON.
 * Persistence: JSON file (v1); replaceable with Prisma/etc. via same shapes.
 */

import type { OverrideStatus } from '@/lib/publishReadiness/effectivePublishStatus'

export type PublishEntityType = 'state' | 'county' | 'town'

export type PublishOverrideRecord = {
  id: string
  entityType: PublishEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  overrideStatus: OverrideStatus
  reason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Stable identity for upsert (matches @@unique intent). */
export function publishOverrideEntityKey(params: {
  entityType: PublishEntityType
  stateSlug: string
  countySlug?: string | null
  townSlug?: string | null
}): string {
  const c = params.countySlug ?? ''
  const t = params.townSlug ?? ''
  return `${params.entityType}:${params.stateSlug.toLowerCase()}:${c}:${t}`
}
