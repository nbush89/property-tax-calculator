/**
 * Append-only Search Console snapshot storage (JSON). Latest row per pagePath chosen at read time.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { SearchPerformanceSnapshotRecord } from './types'

const FILE = path.join(process.cwd(), 'data', 'admin', 'search-performance-snapshots.json')

type StoreFile = { snapshots: SearchPerformanceSnapshotRecord[] }

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as StoreFile
    if (!parsed.snapshots || !Array.isArray(parsed.snapshots)) return { snapshots: [] }
    return parsed
  } catch {
    return { snapshots: [] }
  }
}

async function writeStore(data: StoreFile): Promise<void> {
  await ensureDir()
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8')
}

export async function listSearchPerformanceSnapshots(): Promise<SearchPerformanceSnapshotRecord[]> {
  const { snapshots } = await readStore()
  return snapshots
}

export async function appendSearchPerformanceSnapshots(
  rows: Omit<SearchPerformanceSnapshotRecord, 'id' | 'importedAt'>[],
  importedAtIso: string
): Promise<number> {
  const store = await readStore()
  for (const r of rows) {
    store.snapshots.push({
      ...r,
      id: `sp_${randomUUID()}`,
      importedAt: importedAtIso,
    })
  }
  await writeStore(store)
  return rows.length
}

/** Replace entire snapshot list (explicit reset). */
export async function replaceSearchPerformanceSnapshots(
  rows: Omit<SearchPerformanceSnapshotRecord, 'id' | 'importedAt'>[],
  importedAtIso: string
): Promise<number> {
  const store: StoreFile = {
    snapshots: rows.map(r => ({
      ...r,
      id: `sp_${randomUUID()}`,
      importedAt: importedAtIso,
    })),
  }
  await ensureDir()
  await writeStore(store)
  return rows.length
}

/**
 * Latest snapshot per normalized pagePath by importedAt (ISO string compare).
 */
export function latestSnapshotByPath(
  snapshots: SearchPerformanceSnapshotRecord[]
): Map<string, SearchPerformanceSnapshotRecord> {
  const m = new Map<string, SearchPerformanceSnapshotRecord>()
  const sorted = [...snapshots].sort((a, b) => a.importedAt.localeCompare(b.importedAt))
  for (const s of sorted) {
    m.set(s.pagePath.toLowerCase(), s)
  }
  return m
}
