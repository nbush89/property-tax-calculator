'use server'

import { revalidatePath } from 'next/cache'
import { assertAdminSession } from '@/lib/admin/assertAdminSession'
import { upsertPublishOverride } from '@/lib/admin/publishOverrideStore'
import type { PublishEntityType } from '@/lib/admin/publishOverrideTypes'
import type { OverrideStatus } from '@/lib/publishReadiness/effectivePublishStatus'

export type SavePublishOverrideInput = {
  entityType: PublishEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  overrideStatus: OverrideStatus
  reason?: string | null
  notes?: string | null
}

export async function savePublishOverrideAction(input: SavePublishOverrideInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminSession()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  try {
    await upsertPublishOverride({
      entityType: input.entityType,
      stateSlug: input.stateSlug,
      countySlug: input.countySlug ?? undefined,
      townSlug: input.townSlug ?? undefined,
      overrideStatus: input.overrideStatus,
      reason: input.reason,
      notes: input.notes,
    })
    revalidatePath('/admin/publish-readiness')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    return { ok: false, error: msg }
  }
}
