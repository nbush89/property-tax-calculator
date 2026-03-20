'use server'

import { revalidatePath } from 'next/cache'
import { assertAdminSession } from '@/lib/admin/assertAdminSession'
import { parseSearchConsoleLandingPageCsv } from '@/lib/seo/importSearchConsoleCsv'
import {
  appendSearchPerformanceSnapshots,
  replaceSearchPerformanceSnapshots,
} from '@/lib/seo/searchPerformanceStore'
import { upsertSeoOptimizationReview } from '@/lib/seo/seoReviewStore'
import type { SeoEntityType, SeoReviewStatus } from '@/lib/seo/types'

export type ImportCsvResult =
  | {
      ok: true
      summary: ReturnType<typeof parseSearchConsoleLandingPageCsv>['summary']
      mode: 'append' | 'replace_all'
    }
  | { ok: false; error: string }

export async function importSearchConsoleCsvAction(formData: FormData): Promise<ImportCsvResult> {
  try {
    await assertAdminSession()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  const file = formData.get('csv')
  if (!(file instanceof Blob)) {
    return { ok: false, error: 'No file uploaded' }
  }

  const modeRaw = String(formData.get('mode') ?? 'append')
  const mode = modeRaw === 'replace_all' ? 'replace_all' : 'append'

  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: 'Could not read file' }
  }

  let parsed: ReturnType<typeof parseSearchConsoleLandingPageCsv>
  try {
    parsed = parseSearchConsoleLandingPageCsv(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid CSV'
    return { ok: false, error: msg }
  }

  const importedAt = new Date().toISOString()
  try {
    if (mode === 'replace_all') {
      await replaceSearchPerformanceSnapshots(parsed.rows, importedAt)
    } else {
      await appendSearchPerformanceSnapshots(parsed.rows, importedAt)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    return { ok: false, error: msg }
  }

  if (process.env.SEO_IMPORT_DEBUG === '1') {
    console.log('[seo import]', mode, parsed.summary)
  }

  revalidatePath('/admin/seo-opportunities')
  return { ok: true, summary: parsed.summary, mode }
}

export type SaveSeoReviewInput = {
  pagePath: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  status: SeoReviewStatus
  notes: string | null
}

export async function saveSeoOptimizationReviewAction(
  input: SaveSeoReviewInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminSession()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  try {
    await upsertSeoOptimizationReview({
      pagePath: input.pagePath,
      entityType: input.entityType,
      stateSlug: input.stateSlug,
      countySlug: input.countySlug,
      townSlug: input.townSlug,
      status: input.status,
      notes: input.notes,
    })
    revalidatePath('/admin/seo-opportunities')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    return { ok: false, error: msg }
  }
}
