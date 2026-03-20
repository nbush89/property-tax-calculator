/**
 * File-backed store for PublishOverride records (server-only).
 * Path: data/admin/publish-overrides.json (optional .gitignore for local).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { OverrideStatus } from '@/lib/publishReadiness/effectivePublishStatus'
import type { PublishEntityType, PublishOverrideRecord } from './publishOverrideTypes'
import { publishOverrideEntityKey } from './publishOverrideTypes'

const FILE = path.join(process.cwd(), 'data', 'admin', 'publish-overrides.json')

type StoreFile = { overrides: PublishOverrideRecord[] }

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as StoreFile
    if (!parsed.overrides || !Array.isArray(parsed.overrides)) {
      return { overrides: [] }
    }
    return parsed
  } catch {
    return { overrides: [] }
  }
}

async function writeStore(data: StoreFile): Promise<void> {
  await ensureDir()
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8')
}

export async function listPublishOverrides(): Promise<PublishOverrideRecord[]> {
  const { overrides } = await readStore()
  return overrides
}

export async function getPublishOverrideForEntity(params: {
  entityType: PublishEntityType
  stateSlug: string
  countySlug?: string | null
  townSlug?: string | null
}): Promise<PublishOverrideRecord | null> {
  const key = publishOverrideEntityKey(params)
  const all = await listPublishOverrides()
  return all.find(o => publishOverrideEntityKey(o) === key) ?? null
}

export async function upsertPublishOverride(params: {
  entityType: PublishEntityType
  stateSlug: string
  countySlug?: string | null
  townSlug?: string | null
  overrideStatus: OverrideStatus
  reason?: string | null
  notes?: string | null
}): Promise<PublishOverrideRecord> {
  const now = new Date().toISOString()
  const key = publishOverrideEntityKey(params)
  const store = await readStore()
  const idx = store.overrides.findIndex(o => publishOverrideEntityKey(o) === key)

  const row: PublishOverrideRecord = {
    id: idx >= 0 ? store.overrides[idx]!.id : `ov_${randomUUID()}`,
    entityType: params.entityType,
    stateSlug: params.stateSlug.toLowerCase(),
    countySlug: params.countySlug ?? null,
    townSlug: params.townSlug ?? null,
    overrideStatus: params.overrideStatus,
    reason: params.reason?.trim() || null,
    notes: params.notes?.trim() || null,
    createdAt: idx >= 0 ? store.overrides[idx]!.createdAt : now,
    updatedAt: now,
  }

  if (idx >= 0) {
    store.overrides[idx] = row
  } else {
    store.overrides.push(row)
  }

  await writeStore(store)
  return row
}
