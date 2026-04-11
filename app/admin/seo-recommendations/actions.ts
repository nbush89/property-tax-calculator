'use server'

import { revalidatePath } from 'next/cache'
import { assertAdminSession } from '@/lib/admin/assertAdminSession'
import { buildSeoRecommendationRowsFromCsv } from '@/lib/seo/buildSeoRecommendationRows'
import {
  getReviewMap,
  upsertSeoRecommendationReview,
  type SeoRecommendationReviewStatus,
} from '@/lib/seo/seoRecommendationsReviewStore'

export type ImportSeoQueriesResult =
  | { ok: true; data: ReturnType<typeof buildSeoRecommendationRowsFromCsv> }
  | { ok: false; error: string }

export async function importSearchConsoleQueriesAction(formData: FormData): Promise<ImportSeoQueriesResult> {
  try {
    await assertAdminSession()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  const file = formData.get('csv')
  if (!(file instanceof Blob)) {
    return { ok: false, error: 'No file uploaded' }
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: 'Could not read file' }
  }

  let reviewByPath: Record<string, { status: SeoRecommendationReviewStatus; notes?: string }>
  try {
    reviewByPath = await getReviewMap()
  } catch {
    return { ok: false, error: 'Could not load review state' }
  }

  const pagePathOverrideRaw = formData.get('pagePathOverride')
  const pagePathOverride =
    typeof pagePathOverrideRaw === 'string' && pagePathOverrideRaw.trim().length > 0
      ? pagePathOverrideRaw.trim()
      : undefined

  try {
    const data = buildSeoRecommendationRowsFromCsv(text, reviewByPath, { pagePathOverride })
    return { ok: true, data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not parse CSV'
    return { ok: false, error: msg }
  }
}

export async function saveSeoRecommendationReviewAction(input: {
  pagePath: string
  status: SeoRecommendationReviewStatus
  notes: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdminSession()
  } catch {
    return { ok: false, error: 'Unauthorized' }
  }

  try {
    await upsertSeoRecommendationReview({
      pagePath: input.pagePath,
      status: input.status,
      notes: input.notes,
    })
    revalidatePath('/admin/seo-recommendations')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    return { ok: false, error: msg }
  }
}
