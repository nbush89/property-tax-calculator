/**
 * CTR / SEO workflow state — separate from publish overrides.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { SeoEntityType, SeoOptimizationReviewRecord, SeoReviewStatus } from './types'

const FILE = path.join(process.cwd(), 'data', 'admin', 'seo-optimization-reviews.json')

type StoreFile = { reviews: SeoOptimizationReviewRecord[] }

export function seoReviewKey(pagePath: string): string {
  return pagePath.toLowerCase()
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as StoreFile
    if (!parsed.reviews || !Array.isArray(parsed.reviews)) return { reviews: [] }
    return parsed
  } catch {
    return { reviews: [] }
  }
}

async function writeStore(data: StoreFile): Promise<void> {
  await ensureDir()
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8')
}

export async function listSeoOptimizationReviews(): Promise<SeoOptimizationReviewRecord[]> {
  const { reviews } = await readStore()
  return reviews
}

export async function getSeoReviewByPath(pagePath: string): Promise<SeoOptimizationReviewRecord | null> {
  const key = seoReviewKey(pagePath)
  const all = await listSeoOptimizationReviews()
  return all.find(r => seoReviewKey(r.pagePath) === key) ?? null
}

export async function upsertSeoOptimizationReview(params: {
  pagePath: string
  entityType: SeoEntityType
  stateSlug: string
  countySlug: string | null
  townSlug: string | null
  status: SeoReviewStatus
  notes: string | null
}): Promise<SeoOptimizationReviewRecord> {
  const now = new Date().toISOString()
  const key = seoReviewKey(params.pagePath)
  const store = await readStore()
  const idx = store.reviews.findIndex(r => seoReviewKey(r.pagePath) === key)

  const row: SeoOptimizationReviewRecord = {
    id: idx >= 0 ? store.reviews[idx]!.id : `seo_${randomUUID()}`,
    pagePath: params.pagePath.startsWith('/') ? params.pagePath : `/${params.pagePath}`,
    entityType: params.entityType,
    stateSlug: params.stateSlug.toLowerCase(),
    countySlug: params.countySlug,
    townSlug: params.townSlug,
    status: params.status,
    notes: params.notes?.trim() || null,
    lastReviewedAt: now,
    createdAt: idx >= 0 ? store.reviews[idx]!.createdAt : now,
    updatedAt: now,
  }

  if (idx >= 0) {
    store.reviews[idx] = row
  } else {
    store.reviews.push(row)
  }

  await writeStore(store)
  return row
}
