'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { SeoRecommendationTableRow } from '@/lib/seo/buildSeoRecommendationRows'
import type { SearchConsoleQueriesImportSummary } from '@/lib/seo/importSearchConsoleQueries'
import {
  importSearchConsoleQueriesAction,
  saveSeoRecommendationReviewAction,
} from '@/app/admin/seo-recommendations/actions'
import type { SeoEntityType } from '@/lib/seo/types'
import type { SeoRecommendationReviewStatus } from '@/lib/seo/seoRecommendationsReviewStore'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

function StrengthBadge({ s }: { s: SeoRecommendationTableRow['strength'] }) {
  const map = {
    high: 'danger' as const,
    medium: 'warning' as const,
    low: 'info' as const,
    none: 'neutral' as const,
  }
  return <Badge variant={map[s]}>{s}</Badge>
}

function ReviewStatusBadge({ s }: { s: SeoRecommendationReviewStatus }) {
  const map: Record<SeoRecommendationReviewStatus, 'neutral' | 'success' | 'danger'> = {
    open: 'neutral',
    approved: 'success',
    ignored: 'danger',
  }
  return <Badge variant={map[s]}>{s}</Badge>
}

const ENTITY_OPTS: Array<'all' | SeoEntityType> = ['all', 'state', 'county', 'town']
const REVIEW_OPTS: Array<'all' | SeoRecommendationReviewStatus> = ['all', 'open', 'approved', 'ignored']

export default function SeoRecommendationsConsole() {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<SeoRecommendationTableRow[]>([])
  const [unmatchedPaths, setUnmatchedPaths] = useState<string[]>([])
  const [lastStats, setLastStats] = useState<SearchConsoleQueriesImportSummary | null>(null)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [selected, setSelected] = useState<SeoRecommendationTableRow | null>(null)

  const [entityType, setEntityType] = useState<'all' | SeoEntityType>('all')
  const [stateSlug, setStateSlug] = useState('all')
  const [reviewFilter, setReviewFilter] = useState<(typeof REVIEW_OPTS)[number]>('all')
  const [highOppOnly, setHighOppOnly] = useState(false)
  const [lowCtrOnly, setLowCtrOnly] = useState(false)
  const [search, setSearch] = useState('')

  const states = useMemo(() => {
    const s = new Set(rows.map(r => r.stateSlug))
    return ['all', ...Array.from(s).sort()]
  }, [rows])

  const filtered = useMemo(() => {
    let out = rows.slice()
    if (entityType !== 'all') out = out.filter(r => r.entityType === entityType)
    if (stateSlug !== 'all') out = out.filter(r => r.stateSlug === stateSlug)
    if (reviewFilter !== 'all') out = out.filter(r => r.reviewStatus === reviewFilter)
    if (highOppOnly) out = out.filter(r => r.strength === 'high')
    if (lowCtrOnly) out = out.filter(r => r.ctr < 0.025 && r.impressions >= 20)
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter(
        r =>
          r.entityLabel.toLowerCase().includes(q) ||
          r.pagePath.toLowerCase().includes(q) ||
          (r.primaryQuery && r.primaryQuery.toLowerCase().includes(q)) ||
          r.currentTitle.toLowerCase().includes(q)
      )
    }
    out.sort((a, b) => b.impressions - a.impressions)
    return out
  }, [rows, entityType, stateSlug, reviewFilter, highOppOnly, lowCtrOnly, search])

  async function onImport(formData: FormData) {
    setImportErr(null)
    setImportMsg(null)
    const r = await importSearchConsoleQueriesAction(formData)
    if (!r.ok) {
      setImportErr(r.error)
      return
    }
    setRows(r.data.rows)
    setLastStats(r.data.importSummary)
    setUnmatchedPaths(r.data.unmatchedPagePaths)
    const s = r.data.importSummary
    setImportMsg(
      `Parsed ${s.totalRows} data rows → ${s.validRows} valid query rows (${s.matchedRows} on known routes, ${s.unmatchedRows} unmatched paths) → ${r.data.rows.length} pages in recommendations. Invalid/skipped rows: ${s.invalidRows}.`,
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text">Upload Search Console Queries CSV</h2>
        <div className="text-xs text-text-muted max-w-3xl space-y-2">
          <p>
            <span className="text-text font-medium">Supported uploads:</span> (1) Queries CSV with a{' '}
            <code className="rounded border border-border bg-bg px-1">page</code> column — each row maps to its own URL.
            (2) Single-page Queries export (often no page column after filtering to one URL in Search Console) — enter that
            page below as an override; it applies to every row.
          </p>
          <p>
            Required columns: query (or Top queries), clicks, impressions, CTR, position. Page is optional when you
            supply a path override.
          </p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(() => {
              void onImport(fd)
            })
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-sm block flex-1 min-w-[200px]">
              <span className="text-text-muted">CSV file</span>
              <input type="file" name="csv" accept=".csv,text/csv" required className="mt-1 block w-full text-sm" />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 sm:shrink-0"
            >
              {pending ? 'Processing…' : 'Upload & analyze'}
            </button>
          </div>
          <label className="text-sm block max-w-2xl">
            <span className="text-text-muted">Page URL / path override (for single-page queries exports)</span>
            <input
              type="text"
              name="pagePathOverride"
              autoComplete="off"
              placeholder="https://yoursite.com/state/county/town-property-tax or /state/county/…"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
            />
            <span className="mt-1 block text-xs text-text-muted">
              If Search Console hid the page column because you filtered to one page, paste that URL or site path here.
              When the CSV already includes a page per row, this field is ignored.
            </span>
          </label>
        </form>
        {importErr && <p className="text-sm text-red-600">{importErr}</p>}
        {importMsg && <p className="text-sm text-text">{importMsg}</p>}
        {lastStats && (
          <div className="rounded-lg border border-border bg-bg p-3 text-xs text-text-muted space-y-1">
            <p>
              <span className="text-text font-medium">Import summary:</span> totalRows {lastStats.totalRows}, validRows{' '}
              {lastStats.validRows}, invalidRows {lastStats.invalidRows}, matched query rows {lastStats.matchedRows},
              unmatched query rows {lastStats.unmatchedRows}
            </p>
            {lastStats.usedPageOverride && lastStats.pageOverride && (
              <p>
                <span className="text-text font-medium">Mode:</span> page path override applied to all rows ({lastStats.pageOverride})
              </p>
            )}
            {lastStats.ignoredPagePathOverride && (
              <p className="text-warning">
                A page override was entered but the CSV includes a page column — per-row page values were used (override
                ignored).
              </p>
            )}
            {unmatchedPaths.length > 0 && (
              <p>
                Unmatched page URLs ({unmatchedPaths.length}): not on entity routes — excluded from aggregates.
                Sample: {unmatchedPaths.slice(0, 5).join(', ')}
                {unmatchedPaths.length > 5 ? '…' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-bg p-4 text-sm text-text-muted">
          No recommendations yet. Upload a Queries CSV to aggregate by page and compare against live metadata
          generators.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Pages (matched)" value={rows.length} />
            <SummaryCard label="High strength" value={rows.filter(r => r.strength === 'high').length} tone="danger" />
            <SummaryCard label="Filtered view" value={filtered.length} tone="neutral" />
            <SummaryCard
              label="Approved reviews"
              value={rows.filter(r => r.reviewStatus === 'approved').length}
              tone="success"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-text-muted">Entity:</span>
              {ENTITY_OPTS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntityType(t)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-sm border',
                    entityType === t
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bg text-text-muted border-border hover:border-primary/50',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <label className="text-sm block">
                State
                <select
                  className="mt-1 rounded-lg border border-border bg-bg px-2 py-1"
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
                Review
                <select
                  className="mt-1 rounded-lg border border-border bg-bg px-2 py-1"
                  value={reviewFilter}
                  onChange={e => setReviewFilter(e.target.value as (typeof REVIEW_OPTS)[number])}
                >
                  {REVIEW_OPTS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={highOppOnly} onChange={e => setHighOppOnly(e.target.checked)} />
                High opportunity only
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={lowCtrOnly} onChange={e => setLowCtrOnly(e.target.checked)} />
                Low CTR (&lt;2.5%, min 20 impr.)
              </label>
              <label className="text-sm block flex-1 min-w-[200px]">
                Search
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Path, title, query…"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="border-b border-border bg-bg text-left text-xs text-text-muted uppercase tracking-wide">
                <tr>
                  <th className="p-2">Page</th>
                  <th className="p-2">Entity</th>
                  <th className="p-2 text-right">Impr.</th>
                  <th className="p-2 text-right">CTR</th>
                  <th className="p-2 text-right">Pos</th>
                  <th className="p-2 max-w-[140px]">Top query</th>
                  <th className="p-2">Strength</th>
                  <th className="p-2 max-w-[180px]">Current title</th>
                  <th className="p-2 max-w-[180px]">Suggested title</th>
                  <th className="p-2">Review</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.pagePath} className="border-b border-border hover:bg-bg/80 align-top">
                    <td className="p-2">
                      <code className="text-xs break-all text-text-muted">{row.pagePath}</code>
                    </td>
                    <td className="p-2">
                      <div className="max-w-[160px] text-text">{row.entityLabel}</div>
                      <div className="text-xs text-text-muted">{row.entityType}</div>
                    </td>
                    <td className="p-2 text-right font-mono">{row.impressions}</td>
                    <td className="p-2 text-right font-mono">{(row.ctr * 100).toFixed(2)}%</td>
                    <td className="p-2 text-right font-mono">{row.avgPosition.toFixed(1)}</td>
                    <td className="p-2 text-xs text-text-muted max-w-[140px] truncate" title={row.primaryQuery}>
                      {row.primaryQuery || '—'}
                    </td>
                    <td className="p-2">
                      <StrengthBadge s={row.strength} />
                    </td>
                    <td className="p-2 text-xs text-text-muted max-w-[180px] line-clamp-3" title={row.currentTitle}>
                      {row.currentTitle || '—'}
                    </td>
                    <td className="p-2 text-xs max-w-[180px] line-clamp-3" title={row.suggestedTitle}>
                      {row.suggestedTitle || '—'}
                    </td>
                    <td className="p-2">
                      <ReviewStatusBadge s={row.reviewStatus} />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-primary text-xs hover:underline"
                        onClick={() => setSelected(row)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-3 text-xs text-text-muted border-t border-border">Showing {filtered.length} rows</p>
          </div>
        </>
      )}

      {selected && (
        <DetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={patch => {
            setRows(prev =>
              prev.map(r =>
                r.pagePath === patch.pagePath
                  ? { ...r, reviewStatus: patch.status, notes: patch.notes ?? undefined }
                  : r,
              ),
            )
            setSelected(s =>
              s && s.pagePath === patch.pagePath
                ? { ...s, reviewStatus: patch.status, notes: patch.notes ?? undefined }
                : s,
            )
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
  row: SeoRecommendationTableRow
  onClose: () => void
  onSaved: (patch: { pagePath: string; status: SeoRecommendationReviewStatus; notes: string | null }) => void
}) {
  const [status, setStatus] = useState<SeoRecommendationReviewStatus>(row.reviewStatus)
  const [notes, setNotes] = useState(row.notes ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(row.reviewStatus)
    setNotes(row.notes ?? '')
    setMsg(null)
  }, [row.pagePath, row.reviewStatus, row.notes])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await saveSeoRecommendationReviewAction({
      pagePath: row.pagePath,
      status,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (!res.ok) {
      setMsg(res.error)
      return
    }
    onSaved({ pagePath: row.pagePath, status, notes: notes.trim() || null })
  }

  return (
    <>
      <button type="button" className="fixed inset-0 bg-black/40 z-40" aria-label="Close" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl bg-surface border-l border-border shadow-xl flex flex-col overflow-hidden">
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
              <div className="font-semibold">{row.avgPosition.toFixed(1)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted text-xs">Strength:</span>
            <StrengthBadge s={row.strength} />
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Top queries</h3>
            <ul className="space-y-1 text-xs">
              {row.topQueries.map((q, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-border/60 py-1">
                  <span className="text-text flex-1">{q.query}</span>
                  <span className="text-text-muted whitespace-nowrap">{q.impressions} impr.</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Current</h3>
            <p className="text-xs text-text font-medium">{row.currentTitle || '—'}</p>
            <p className="text-xs text-text-muted mt-2">{row.currentMeta || '—'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Suggested</h3>
            <p className="text-xs text-primary font-medium">{row.suggestedTitle || '—'}</p>
            <p className="text-xs text-text mt-2">{row.suggestedMeta || '—'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Rationale</h3>
            {row.rationale.length === 0 ? (
              <p className="text-xs text-text-muted">None</p>
            ) : (
              <ul className="list-disc pl-4 text-xs text-text-muted space-y-1">
                {row.rationale.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-text mb-2">Detected issues</h3>
            {row.detectedIssues.length === 0 ? (
              <p className="text-xs text-text-muted">None from metadata audit</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {row.detectedIssues.map((line, i) => (
                  <li key={i} className="rounded border border-border bg-bg p-2 text-text-muted">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border pt-4 space-y-3">
            <h3 className="font-semibold text-text">Review (local JSON)</h3>
            <p className="text-xs text-text-muted">
              Marks status only — does not change live metadata or routes.
            </p>
            <label className="block">
              <span className="text-text-muted text-xs">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2"
                value={status}
                onChange={e => setStatus(e.target.value as SeoRecommendationReviewStatus)}
              >
                <option value="open">open</option>
                <option value="approved">approved</option>
                <option value="ignored">ignored</option>
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
