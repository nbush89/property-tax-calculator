'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SeoOpportunityRow } from '@/lib/seo/loadSeoOpportunities'
import type { SeoEntityType, SeoReviewStatus } from '@/lib/seo/types'
import type { PublishDecision } from '@/lib/publishReadiness/types'
import type { EffectivePublishStatus } from '@/lib/publishReadiness/effectivePublishStatus'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  importSearchConsoleCsvAction,
  saveSeoOptimizationReviewAction,
} from '@/app/admin/seo-opportunities/actions'

function DecisionBadge({ d }: { d: PublishDecision | EffectivePublishStatus }) {
  if (d === 'publish') return <Badge variant="success">publish</Badge>
  if (d === 'publish_with_warnings') return <Badge variant="warning">publish+warn</Badge>
  if (d === 'hold') return <Badge variant="danger">hold</Badge>
  return <Badge variant="info">review</Badge>
}

function OppBadge({ level }: { level: SeoOpportunityRow['opportunityLevel'] }) {
  if (level === 'high') return <Badge variant="danger">high</Badge>
  if (level === 'medium') return <Badge variant="warning">medium</Badge>
  if (level === 'low') return <Badge variant="info">low</Badge>
  return <Badge variant="neutral">none</Badge>
}

function ReviewBadge({ s }: { s: SeoReviewStatus }) {
  const map: Record<SeoReviewStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
    open: 'neutral',
    in_progress: 'info',
    optimized: 'success',
    ignore: 'danger',
  }
  return <Badge variant={map[s]}>{s.replace('_', ' ')}</Badge>
}

/**
 * Shows actual CTR as a ratio of the expected CTR at the page's average position.
 * Helps distinguish "genuinely low CTR" from "low CTR because we rank at position 18."
 *   ≥ 1.00 → at/above expected (ranking is the lever, not copy)
 *   0.70–0.99 → slightly below (monitor)
 *   < 0.70 → meaningfully below (title/meta work likely worth it)
 */
function CtrVsExpectedCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-text-muted font-mono text-xs">—</span>
  }
  const pct = Math.round(value * 100)
  const cls =
    value >= 1.0
      ? 'text-emerald-600'
      : value >= 0.7
        ? 'text-amber-600'
        : 'text-red-600'
  return (
    <span className={cn('font-mono text-xs font-medium', cls)} title={`${pct}% of expected CTR for this position`}>
      {pct}%
    </span>
  )
}

const ENTITY_OPTS: Array<'all' | SeoEntityType> = ['all', 'state', 'county', 'town']
const OPP_OPTS = ['all', 'high', 'medium', 'low', 'none'] as const
const REVIEW_OPTS: Array<'all' | SeoReviewStatus> = [
  'all',
  'open',
  'in_progress',
  'optimized',
  'ignore',
]
const PUBLISH_OPTS = ['all', 'published', 'not_published'] as const

type SortKey =
  | 'priority_desc'
  | 'impressions_desc'
  | 'ctr_asc'
  | 'position_asc'
  | 'position_desc'
  | 'reviewed_desc'

export default function SeoOpportunitiesConsole({ initialRows }: { initialRows: SeoOpportunityRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<SeoOpportunityRow | null>(null)

  const [entityType, setEntityType] = useState<'all' | SeoEntityType>('all')
  const [stateSlug, setStateSlug] = useState('all')
  const [countySlug, setCountySlug] = useState('all')
  const [oppLevel, setOppLevel] = useState<(typeof OPP_OPTS)[number]>('all')
  const [reviewStatus, setReviewStatus] = useState<(typeof REVIEW_OPTS)[number]>('all')
  const [publishFilter, setPublishFilter] = useState<(typeof PUBLISH_OPTS)[number]>('published')
  const [lowCtrOnly, setLowCtrOnly] = useState(false)
  const [metaIssuesOnly, setMetaIssuesOnly] = useState(false)
  const [impMin, setImpMin] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('priority_desc')

  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErr, setImportErr] = useState<string | null>(null)

  const states = useMemo(() => {
    const s = new Set(initialRows.map(r => r.stateSlug))
    return ['all', ...Array.from(s).sort()]
  }, [initialRows])

  const counties = useMemo(() => {
    const s = new Set(
      initialRows.filter(r => r.countySlug).map(r => r.countySlug as string)
    )
    return ['all', ...Array.from(s).sort()]
  }, [initialRows])

  const summary = useMemo(() => {
    let high = 0
    let withMeta = 0
    for (const r of initialRows) {
      if (r.opportunityLevel === 'high') high++
      if (r.metadataIssueCount > 0) withMeta++
    }
    return { total: initialRows.length, high, withMeta }
  }, [initialRows])

  const filtered = useMemo(() => {
    let rows = initialRows.slice()
    if (entityType !== 'all') rows = rows.filter(r => r.entityType === entityType)
    if (stateSlug !== 'all') rows = rows.filter(r => r.stateSlug === stateSlug)
    if (countySlug !== 'all') rows = rows.filter(r => r.countySlug === countySlug)
    if (oppLevel !== 'all') rows = rows.filter(r => r.opportunityLevel === oppLevel)
    if (reviewStatus !== 'all') rows = rows.filter(r => r.reviewStatus === reviewStatus)
    if (publishFilter === 'published') rows = rows.filter(r => r.effectivePublished)
    if (publishFilter === 'not_published') rows = rows.filter(r => !r.effectivePublished)
    if (lowCtrOnly) rows = rows.filter(r => r.ctr < 0.03 && r.impressions >= 50)
    if (metaIssuesOnly) rows = rows.filter(r => r.metadataIssueCount > 0)
    const minI = Number.parseInt(impMin, 10)
    if (Number.isFinite(minI) && minI > 0) {
      rows = rows.filter(r => r.impressions >= minI)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        r =>
          r.entityLabel.toLowerCase().includes(q) ||
          r.pagePath.toLowerCase().includes(q) ||
          r.stateSlug.includes(q) ||
          (r.countySlug?.toLowerCase().includes(q) ?? false) ||
          (r.townSlug?.toLowerCase().includes(q) ?? false)
      )
    }

    rows.sort((a, b) => {
      switch (sort) {
        case 'impressions_desc':
          return b.impressions - a.impressions
        case 'ctr_asc':
          return a.ctr - b.ctr
        case 'position_asc':
          return a.averagePosition - b.averagePosition
        case 'position_desc':
          return b.averagePosition - a.averagePosition
        case 'reviewed_desc':
          return (b.lastReviewedAt ?? '').localeCompare(a.lastReviewedAt ?? '')
        default:
          return b.priorityScore - a.priorityScore
      }
    })
    return rows
  }, [
    initialRows,
    entityType,
    stateSlug,
    countySlug,
    oppLevel,
    reviewStatus,
    publishFilter,
    lowCtrOnly,
    metaIssuesOnly,
    impMin,
    search,
    sort,
  ])

  async function onImportCsv(formData: FormData) {
    setImportMsg(null)
    setImportErr(null)
    const r = await importSearchConsoleCsvAction(formData)
    if (!r.ok) {
      setImportErr(r.error)
      return
    }
    setImportMsg(
      `Imported ${r.summary.imported} matched paths (${r.mode}). Rows in file: ${r.summary.totalRows}. Unmatched: ${r.summary.unmatched}. Invalid: ${r.summary.invalid}.`
    )
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6">
      {initialRows.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-bg p-4 text-sm text-text-muted">
          No search performance snapshots yet. Upload a Search Console CSV above to populate this table.
          Latest row per URL is used when multiple imports exist (append mode keeps history on disk).
        </p>
      )}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text">Import Search Console CSV</h2>
        <p className="text-xs text-text-muted">
          Export “Pages” with columns: Top pages (or Page), Clicks, Impressions, CTR, Position.
          Only URLs that match this app’s state/county/town routes are stored.
        </p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(() => {
              void (async () => {
                await onImportCsv(fd)
              })()
            })
          }}
        >
          <label className="text-sm block">
            <span className="text-text-muted">CSV file</span>
            <input type="file" name="csv" accept=".csv,text/csv" required className="mt-1 block w-full text-sm" />
          </label>
          <label className="text-sm block">
            <span className="text-text-muted">Mode</span>
            <select name="mode" className="mt-1 rounded-lg border border-border bg-bg px-2 py-2 text-sm w-full sm:w-44">
              <option value="append">Append (keep history)</option>
              <option value="replace_all">Replace all snapshots</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? 'Uploading…' : 'Upload & import'}
          </button>
        </form>
        {importErr && <p className="text-sm text-red-600">{importErr}</p>}
        {importMsg && <p className="text-sm text-text">{importMsg}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Snapshot paths" value={summary.total} />
        <SummaryCard label="High opportunity" value={summary.high} tone="danger" />
        <SummaryCard label="With meta flags" value={summary.withMeta} tone="warn" />
        <SummaryCard label="Filtered" value={filtered.length} tone="neutral" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-text-muted">Type:</span>
          {ENTITY_OPTS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setEntityType(t)}
              className={cn(
                'rounded-lg px-3 py-1 text-sm border',
                entityType === t
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg text-text-muted border-border hover:border-primary/50'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm block">
            State
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              value={stateSlug}
              onChange={e => setStateSlug(e.target.value)}
            >
              {states.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            County
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              value={countySlug}
              onChange={e => setCountySlug(e.target.value)}
            >
              {counties.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            Opportunity
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              value={oppLevel}
              onChange={e => setOppLevel(e.target.value as (typeof OPP_OPTS)[number])}
            >
              {OPP_OPTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            Review status
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              value={reviewStatus}
              onChange={e => setReviewStatus(e.target.value as (typeof REVIEW_OPTS)[number])}
            >
              {REVIEW_OPTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            Publish (effective)
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              value={publishFilter}
              onChange={e => setPublishFilter(e.target.value as (typeof PUBLISH_OPTS)[number])}
            >
              <option value="all">All</option>
              <option value="published">Published only (default)</option>
              <option value="not_published">Not published</option>
            </select>
          </label>
          <label className="text-sm block">
            Sort
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
            >
              <option value="priority_desc">Priority ↓</option>
              <option value="impressions_desc">Impressions ↓</option>
              <option value="ctr_asc">CTR ↑</option>
              <option value="position_asc">Position ↑ (better)</option>
              <option value="position_desc">Position ↓</option>
              <option value="reviewed_desc">Last reviewed</option>
            </select>
          </label>
          <label className="text-sm block">
            Impressions min
            <input
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              type="number"
              min={0}
              placeholder="e.g. 100"
              value={impMin}
              onChange={e => setImpMin(e.target.value)}
            />
          </label>
          <label className="text-sm flex items-center gap-2 mt-6">
            <input type="checkbox" checked={lowCtrOnly} onChange={e => setLowCtrOnly(e.target.checked)} />
            Low CTR (50+ imp, CTR &lt; 3%)
          </label>
          <label className="text-sm flex items-center gap-2 mt-6">
            <input type="checkbox" checked={metaIssuesOnly} onChange={e => setMetaIssuesOnly(e.target.checked)} />
            Metadata issues only
          </label>
          <label className="text-sm block md:col-span-2">
            Search
            <input
              type="search"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              placeholder="label or path"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg"
        >
          {pending ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg border-b border-border text-left text-text-muted">
            <tr>
              <th className="p-2 font-medium">Entity</th>
              <th className="p-2 font-medium">Type</th>
              <th className="p-2 font-medium">State</th>
              <th className="p-2 font-medium">County</th>
              <th className="p-2 font-medium text-right">Impr.</th>
              <th className="p-2 font-medium text-right">Clicks</th>
              <th className="p-2 font-medium text-right">CTR</th>
              <th
                className="p-2 font-medium text-right"
                title="CTR as % of expected CTR for that average position. <70% = title/meta likely the issue. ≥100% = ranking is the lever."
              >
                vs Exp
              </th>
              <th className="p-2 font-medium text-right">Pos</th>
              <th className="p-2 font-medium">Opp</th>
              <th className="p-2 font-medium text-right">Pri</th>
              <th className="p-2 font-medium">Publish</th>
              <th className="p-2 font-medium">Review</th>
              <th className="p-2 font-medium">Meta</th>
              <th className="p-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr
                key={row.pagePath}
                className="border-b border-border hover:bg-bg/80 cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <td className="p-2 max-w-[200px] truncate text-text" title={row.entityLabel}>
                  {row.entityLabel}
                </td>
                <td className="p-2 text-text-muted">{row.entityType}</td>
                <td className="p-2">{row.stateSlug}</td>
                <td className="p-2 text-text-muted">{row.countySlug ?? '—'}</td>
                <td className="p-2 text-right font-mono">{row.impressions}</td>
                <td className="p-2 text-right font-mono">{row.clicks}</td>
                <td className="p-2 text-right font-mono">{(row.ctr * 100).toFixed(2)}%</td>
                <td className="p-2 text-right">
                  <CtrVsExpectedCell value={row.ctrVsExpected} />
                </td>
                <td className="p-2 text-right font-mono">{row.averagePosition.toFixed(1)}</td>
                <td className="p-2">
                  <OppBadge level={row.opportunityLevel} />
                </td>
                <td className="p-2 text-right font-mono">{row.priorityScore.toFixed(1)}</td>
                <td className="p-2">
                  <DecisionBadge d={row.effectiveStatus} />
                </td>
                <td className="p-2">
                  <ReviewBadge s={row.reviewStatus} />
                </td>
                <td className="p-2 text-xs text-text-muted max-w-[120px] truncate" title={row.metadataSummary}>
                  {row.metadataSummary}
                </td>
                <td className="p-2 text-xs whitespace-nowrap text-text-muted">
                  {row.importedAt.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-3 text-xs text-text-muted border-t border-border">Showing {filtered.length} rows</p>
      </div>

      {selected && (
        <DetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            startTransition(() => router.refresh())
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'warn' | 'danger' | 'info' | 'neutral'
}) {
  const cls =
    tone === 'success'
      ? 'border-success/30 bg-success-soft/30'
      : tone === 'warn'
        ? 'border-warning/30 bg-warning/10'
        : tone === 'danger'
          ? 'border-red-500/25 bg-red-500/5'
          : tone === 'info'
            ? 'border-primary/25 bg-primary-soft/30'
            : 'border-border bg-bg'
  return (
    <div className={cn('rounded-lg border p-3', cls)}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-semibold text-text">{value}</p>
    </div>
  )
}

function DetailDrawer({
  row,
  onClose,
  onSaved,
}: {
  row: SeoOpportunityRow
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<SeoReviewStatus>(row.reviewStatus)
  const [notes, setNotes] = useState(row.reviewNotes ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await saveSeoOptimizationReviewAction({
      pagePath: row.pagePath,
      entityType: row.entityType,
      stateSlug: row.stateSlug,
      countySlug: row.countySlug,
      townSlug: row.townSlug,
      status,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (!res.ok) {
      setMsg(res.error)
      return
    }
    onSaved()
  }

  return (
    <>
      <button type="button" className="fixed inset-0 bg-black/40 z-40" aria-label="Close" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-start gap-3">
          <div>
            <h2 className="font-semibold text-text text-lg">{row.entityLabel}</h2>
            <code className="text-xs text-text-muted break-all">{row.pagePath}</code>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-bg p-2">
              <div className="text-text-muted text-xs">Impressions</div>
              <div className="font-semibold">{row.impressions}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2">
              <div className="text-text-muted text-xs">Clicks</div>
              <div className="font-semibold">{row.clicks}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2">
              <div className="text-text-muted text-xs">CTR</div>
              <div className="font-semibold">{(row.ctr * 100).toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2">
              <div className="text-text-muted text-xs">Avg position</div>
              <div className="font-semibold">{row.averagePosition.toFixed(1)}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 col-span-2">
              <div className="text-text-muted text-xs mb-1">
                CTR vs expected for position {row.averagePosition.toFixed(0)}
                {' '}(expected: {(row.expectedCtr * 100).toFixed(1)}%)
              </div>
              {row.ctrVsExpected === null ? (
                <p className="text-xs text-text-muted">Not enough impressions to compare reliably.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <CtrVsExpectedCell value={row.ctrVsExpected} />
                  <p className="text-xs text-text-muted">
                    {row.ctrVsExpected >= 1.0
                      ? 'At or above expected — ranking higher is the primary lever here, not copy changes.'
                      : row.ctrVsExpected >= 0.7
                        ? 'Slightly below expected — monitor; minor title/meta tweaks may help.'
                        : 'Meaningfully below expected — title and meta description are likely the bottleneck. Prioritize copy changes.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-text-muted text-xs">Opportunity:</span>
            <OppBadge level={row.opportunityLevel} />
            <span className="text-text-muted">score {row.priorityScore.toFixed(1)}</span>
          </div>
          <ul className="text-xs text-text-muted list-disc pl-4 space-y-1">
            {row.opportunityReasons.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg border border-border bg-bg p-2 text-xs">
              <span className="text-text-muted">Effective publish</span>
              <div className="mt-1">
                <DecisionBadge d={row.effectiveStatus} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 text-xs">
              <span className="text-text-muted">Validator</span>
              <div className="mt-1">
                <DecisionBadge d={row.validatorDecision} />
              </div>
            </div>
            {row.manualOverrideActive && <Badge variant="info">override</Badge>}
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Snippet preview</h3>
            <div className="rounded-lg border border-border bg-bg p-3 gap-1 flex flex-col">
              <p className="text-primary text-sm line-clamp-2">{row.titlePreview || '—'}</p>
              <p className="text-xs text-text-muted truncate">{row.pagePath}</p>
              <p className="text-xs text-text-muted line-clamp-3">{row.descriptionPreview || '—'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">H1 (resolved)</h3>
            <p className="text-xs text-text-muted">{row.h1Preview ?? '—'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Metadata diagnostics</h3>
            {row.diagnostics.length === 0 ? (
              <p className="text-xs text-text-muted">None</p>
            ) : (
              <ul className="space-y-2">
                {row.diagnostics.map((d, i) => (
                  <li key={i} className="text-xs rounded border border-border p-2 bg-bg">
                    <span className="font-mono text-text">{d.code}</span>{' '}
                    <span
                      className={
                        d.severity === 'error'
                          ? 'text-red-600'
                          : d.severity === 'warning'
                            ? 'text-warning'
                            : 'text-text-muted'
                      }
                    >
                      {d.severity}
                    </span>
                    <p className="text-text-muted mt-1">{d.message}</p>
                    {d.recommendation && <p className="text-primary mt-1">{d.recommendation}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-xs text-text-muted">
            Snapshot imported {row.importedAt}
            {row.sourceDateStart && ` · SC range ${row.sourceDateStart}–${row.sourceDateEnd ?? '?'}`}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border pt-4 space-y-3">
            <h3 className="font-semibold text-text">CTR optimization review</h3>
            <p className="text-xs text-text-muted">
              Tracks editorial SEO work only — not publish overrides.
            </p>
            <label className="block">
              <span className="text-text-muted text-xs">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2"
                value={status}
                onChange={e => setStatus(e.target.value as SeoReviewStatus)}
              >
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="optimized">optimized</option>
                <option value="ignore">ignore</option>
              </select>
            </label>
            <label className="block">
              <span className="text-text-muted text-xs">Notes</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 min-h-[80px]"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save review'}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
