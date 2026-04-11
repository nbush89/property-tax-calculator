/**
 * Review state for SEO Recommendations admin tab (JSON-backed, no DB).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'admin', 'seo-recommendations.json')

export type SeoRecommendationReviewStatus = 'open' | 'approved' | 'ignored'

export type SeoRecommendationReviewEntry = {
  status: SeoRecommendationReviewStatus
  notes?: string
  updatedAt?: string
}

export type SeoRecommendationReviewFile = {
  version: 1
  /** Lowercase path keys */
  byPath: Record<string, SeoRecommendationReviewEntry>
}

export function recommendationReviewKey(pagePath: string): string {
  let p = pagePath.trim().toLowerCase()
  if (!p.startsWith('/')) p = `/${p}`
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
}

export async function readSeoRecommendationReviews(): Promise<SeoRecommendationReviewFile> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as SeoRecommendationReviewFile
    if (!parsed.byPath || typeof parsed.byPath !== 'object') {
      return { version: 1, byPath: {} }
    }
    return { version: 1, byPath: parsed.byPath }
  } catch {
    return { version: 1, byPath: {} }
  }
}

export async function upsertSeoRecommendationReview(params: {
  pagePath: string
  status: SeoRecommendationReviewStatus
  notes?: string | null
}): Promise<void> {
  const store = await readSeoRecommendationReviews()
  const key = recommendationReviewKey(params.pagePath)
  const now = new Date().toISOString()
  store.byPath[key] = {
    status: params.status,
    notes: params.notes?.trim() || undefined,
    updatedAt: now,
  }
  await ensureDir()
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), 'utf8')
}

export async function getReviewMap(): Promise<Record<string, SeoRecommendationReviewEntry>> {
  const { byPath } = await readSeoRecommendationReviews()
  return { ...byPath }
}
