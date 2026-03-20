'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PublishReviewRow } from '@/lib/admin/buildPublishReviewRows'
import type { PublishEntityType } from '@/lib/admin/publishOverrideTypes'
import type { OverrideStatus } from '@/lib/publishReadiness/effectivePublishStatus'
import type { PublishDecision } from '@/lib/publishReadiness/types'
import type { EffectivePublishStatus } from '@/lib/publishReadiness/effectivePublishStatus'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { savePublishOverrideAction } from '@/app/admin/publish-readiness/actions'
import { isHighVisibilityIssue } from '@/components/admin/publishIssueConfig'

function DecisionBadge({ d }: { d: PublishDecision | EffectivePublishStatus }) {
  if (d === 'publish') return <Badge variant="success">publish</Badge>
  if (d === 'publish_with_warnings') return <Badge variant="warning">publish (warn)</Badge>
  if (d === 'hold') return <Badge variant="danger">hold</Badge>
  return <Badge variant="info">review</Badge>
}

const ENTITY_FILTERS: Array<'all' | PublishEntityType> = ['all', 'town', 'county', 'state']

export default function PublishReadinessConsole({ initialRows }: { initialRows: PublishReviewRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<PublishReviewRow | null>(null)

  const [entityType, setEntityType] = useState<'all' | PublishEntityType>('all')
  const [stateSlug, setStateSlug] = useState<string>('all')
  const [countySlug, setCountySlug] = useState<string>('all')
  const [effectiveFilter, setEffectiveFilter] = useState<string>('all')
  const [validatorFilter, setValidatorFilter] = useState<string>('all')
  const [warningsOnly, setWarningsOnly] = useState(false)
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [fallbackOnly, setFallbackOnly] = useState(false)
  const [overrideOnly, setOverrideOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'score-asc' | 'warn-desc' | 'label'>('warn-desc')

  const states = useMemo(() => {
    const s = new Set(initialRows.map(r => r.stateSlug))
    return ['all', ...Array.from(s).sort()]
  }, [initialRows])

  const counties = useMemo(() => {
    const s = new Set(
      initialRows.filter(r => r.entityType !== 'state' && r.countySlug).map(r => r.countySlug!)
    )
    return ['all', ...Array.from(s).sort()]
  }, [initialRows])

  const summary = useMemo(() => {
    let publish = 0
    let pw = 0
    let hold = 0
    let review = 0
    let overrides = 0
    for (const r of initialRows) {
      if (r.manualOverrideActive) overrides++
      if (r.effectiveStatus === 'publish') publish++
      else if (r.effectiveStatus === 'publish_with_warnings') pw++
      else if (r.effectiveStatus === 'hold') hold++
      else review++
    }
    return {
      total: initialRows.length,
      publish,
      publishWithWarnings: pw,
      hold,
      review,
      overrides,
    }
  }, [initialRows])

  const filtered = useMemo(() => {
    let rows = initialRows.slice()
    if (entityType !== 'all') rows = rows.filter(r => r.entityType === entityType)
    if (stateSlug !== 'all') rows = rows.filter(r => r.stateSlug === stateSlug)
    if (countySlug !== 'all') rows = rows.filter(r => r.countySlug === countySlug)
    if (effectiveFilter !== 'all') rows = rows.filter(r => r.effectiveStatus === effectiveFilter)
    if (validatorFilter !== 'all') rows = rows.filter(r => r.validatorDecision === validatorFilter)
    if (warningsOnly) rows = rows.filter(r => r.warningsCount > 0)
    if (errorsOnly) rows = rows.filter(r => r.errorsCount > 0)
    if (fallbackOnly) rows = rows.filter(r => r.metrics.fallbackUsed)
    if (overrideOnly) rows = rows.filter(r => r.manualOverrideActive)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        r =>
          r.entityLabel.toLowerCase().includes(q) ||
          r.stateSlug.includes(q) ||
          (r.countySlug?.toLowerCase().includes(q) ?? false) ||
          (r.townSlug?.toLowerCase().includes(q) ?? false)
      )
    }
    rows.sort((a, b) => {
      if (sort === 'score-asc') return a.score - b.score
      if (sort === 'label') return a.entityLabel.localeCompare(b.entityLabel)
      return b.warningsCount - a.warningsCount || b.errorsCount - a.errorsCount
    })
    return rows
  }, [
    initialRows,
    entityType,
    stateSlug,
    countySlug,
    effectiveFilter,
    validatorFilter,
    warningsOnly,
    errorsOnly,
    fallbackOnly,
    overrideOnly,
    search,
    sort,
  ])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total rows" value={summary.total} />
        <SummaryCard label="Effective publish" value={summary.publish} tone="success" />
        <SummaryCard label="Eff. publish+warn" value={summary.publishWithWarnings} tone="warn" />
        <SummaryCard label="Effective hold" value={summary.hold} tone="danger" />
        <SummaryCard label="In review" value={summary.review} tone="info" />
        <SummaryCard label="Manual overrides" value={summary.overrides} tone="neutral" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-text-muted">Type:</span>
          {ENTITY_FILTERS.map(t => (
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
            <span className="text-text-muted">State</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 text-text"
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
            <span className="text-text-muted">County</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 text-text"
              value={countySlug}
              onChange={e => setCountySlug(e.target.value)}
            >
              {counties.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            <span className="text-text-muted">Effective status</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 text-text"
              value={effectiveFilter}
              onChange={e => setEffectiveFilter(e.target.value)}
            >
              <option value="all">all</option>
              <option value="publish">publish</option>
              <option value="publish_with_warnings">publish_with_warnings</option>
              <option value="hold">hold</option>
              <option value="review">review</option>
            </select>
          </label>
          <label className="text-sm block">
            <span className="text-text-muted">Validator decision</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 text-text"
              value={validatorFilter}
              onChange={e => setValidatorFilter(e.target.value)}
            >
              <option value="all">all</option>
              <option value="publish">publish</option>
              <option value="publish_with_warnings">publish_with_warnings</option>
              <option value="hold">hold</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4 items-center text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={warningsOnly}
              onChange={e => setWarningsOnly(e.target.checked)}
            />
            Has warnings
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={errorsOnly} onChange={e => setErrorsOnly(e.target.checked)} />
            Has errors
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fallbackOnly}
              onChange={e => setFallbackOnly(e.target.checked)}
            />
            Fallback primary
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overrideOnly}
              onChange={e => setOverrideOnly(e.target.checked)}
            />
            Manual override
          </label>
          <label className="text-sm flex items-center gap-2">
            Sort
            <select
              className="rounded border border-border bg-bg px-2 py-1"
              value={sort}
              onChange={e => setSort(e.target.value as typeof sort)}
            >
              <option value="warn-desc">warnings ↓</option>
              <option value="score-asc">score ↑</option>
              <option value="label">label A–Z</option>
            </select>
          </label>
          <label className="text-sm flex-1 min-w-[12rem]">
            Search
            <input
              type="search"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1"
              placeholder="name / slug"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg"
          >
            {pending ? 'Refreshing…' : 'Revalidate (reload)'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg border-b border-border text-left text-text-muted">
            <tr>
              <th className="p-2 font-medium">Entity</th>
              <th className="p-2 font-medium">Type</th>
              <th className="p-2 font-medium">State</th>
              <th className="p-2 font-medium">County</th>
              <th className="p-2 font-medium text-right">Score</th>
              <th className="p-2 font-medium">Validator</th>
              <th className="p-2 font-medium">Effective</th>
              <th className="p-2 font-medium text-center">W</th>
              <th className="p-2 font-medium text-center">E</th>
              <th className="p-2 font-medium">Fallback</th>
              <th className="p-2 font-medium">Primary</th>
              <th className="p-2 font-medium">Trend</th>
              <th className="p-2 font-medium">Updated</th>
              <th className="p-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr
                key={row.rowKey}
                className="border-b border-border hover:bg-bg/80 cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <td className="p-2 text-text max-w-[200px] truncate" title={row.entityLabel}>
                  {row.entityLabel}
                </td>
                <td className="p-2 text-text-muted">{row.entityType}</td>
                <td className="p-2">{row.stateSlug}</td>
                <td className="p-2 text-text-muted">{row.countySlug ?? '—'}</td>
                <td className="p-2 text-right font-mono">{row.score}</td>
                <td className="p-2">
                  <DecisionBadge d={row.validatorDecision} />
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1 items-center">
                    <DecisionBadge d={row.effectiveStatus} />
                    {row.manualOverrideActive && (
                      <Badge variant="info" className="text-xs">
                        override
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-2 text-center">{row.warningsCount}</td>
                <td className="p-2 text-center">{row.errorsCount}</td>
                <td className="p-2">{row.metrics.fallbackUsed ? 'yes' : '—'}</td>
                <td className="p-2 text-xs text-text-muted">{row.metrics.primaryMetricKey ?? '—'}</td>
                <td className="p-2 text-xs text-text-muted">{row.metrics.trendMetricKey ?? '—'}</td>
                <td className="p-2 text-xs text-text-muted whitespace-nowrap">
                  {row.lastReviewedAt ? row.lastReviewedAt.slice(0, 10) : '—'}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="text-primary hover:underline text-xs"
                    onClick={e => {
                      e.stopPropagation()
                      setSelected(row)
                    }}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-3 text-xs text-text-muted border-t border-border">
          Showing {filtered.length} of {initialRows.length} rows
        </p>
      </div>

      {selected && (
        <DetailDrawer
          key={selected.rowKey}
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
  row: PublishReviewRow
  onClose: () => void
  onSaved: () => void
}) {
  const [overrideStatus, setOverrideStatus] = useState<OverrideStatus>(row.overrideStatus)
  const [reason, setReason] = useState(row.reason ?? '')
  const [notes, setNotes] = useState(row.notes ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const grouped = useMemo(() => {
    const errs = row.issues.filter(i => i.severity === 'error')
    const warns = row.issues.filter(i => i.severity === 'warning')
    const infos = row.issues.filter(i => i.severity === 'info')
    return { errs, warns, infos }
  }, [row.issues])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await savePublishOverrideAction({
      entityType: row.entityType,
      stateSlug: row.stateSlug,
      countySlug: row.countySlug,
      townSlug: row.townSlug,
      overrideStatus,
      reason: reason || null,
      notes: notes || null,
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
      <button
        type="button"
        className="fixed inset-0 bg-black/40 z-40"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-start gap-3">
          <div>
            <h2 className="font-semibold text-text text-lg">{row.entityLabel}</h2>
            {row.canonicalPath && (
              <code className="text-xs text-text-muted break-all">{row.canonicalPath}</code>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg border border-border bg-bg p-2 text-xs">
              <span className="text-text-muted">Validator</span>
              <div className="mt-1">
                <DecisionBadge d={row.validatorDecision} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 text-xs">
              <span className="text-text-muted">Override</span>
              <div className="mt-1 font-medium text-text">{row.overrideStatus}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 text-xs">
              <span className="text-text-muted">Effective</span>
              <div className="mt-1">
                <DecisionBadge d={row.effectiveStatus} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-bg p-2 border border-border">
              <div className="text-text-muted text-xs">Score</div>
              <div className="font-semibold">{row.score}</div>
            </div>
            <div className="rounded-lg bg-bg p-2 border border-border">
              <div className="text-text-muted text-xs">Warnings</div>
              <div className="font-semibold text-warning">{row.warningsCount}</div>
            </div>
            <div className="rounded-lg bg-bg p-2 border border-border">
              <div className="text-text-muted text-xs">Errors</div>
              <div className="font-semibold text-red-600">{row.errorsCount}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-2">High-signal issues</h3>
            <div className="flex flex-wrap gap-1">
              {row.issues.filter(i => isHighVisibilityIssue(i.code)).length === 0 ? (
                <span className="text-xs text-text-muted">None flagged</span>
              ) : (
                row.issues
                  .filter(i => isHighVisibilityIssue(i.code))
                  .map(i => (
                    <span
                      key={`${i.code}-${i.message.slice(0, 8)}`}
                      className={cn(
                        'text-xs rounded px-2 py-0.5 border',
                        i.severity === 'error'
                          ? 'border-red-500/40 bg-red-500/10 text-red-600'
                          : i.severity === 'warning'
                            ? 'border-warning/40 bg-warning/10 text-warning'
                            : 'border-border bg-bg text-text-muted'
                      )}
                    >
                      {i.code}
                    </span>
                  ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-2">Sections</h3>
            <ul className="grid grid-cols-2 gap-1 text-xs text-text-muted">
              {Object.entries(row.sections).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2 border-b border-border/50 py-0.5">
                  <span>{k}</span>
                  <span className={v ? 'text-success' : 'text-text-muted'}>{v ? 'yes' : 'no'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-2">Metrics</h3>
            <ul className="text-xs space-y-1 text-text-muted">
              <li>primaryMetricResolved: {String(row.metrics.primaryMetricResolved)}</li>
              <li>primaryMetricKey: {row.metrics.primaryMetricKey ?? '—'}</li>
              <li>fallbackUsed: {String(row.metrics.fallbackUsed)}</li>
              <li>trendMetricResolved: {String(row.metrics.trendMetricResolved)}</li>
              <li>trendMetricKey: {row.metrics.trendMetricKey ?? '—'}</li>
              <li>trendCountyContext: {String(row.metrics.trendCountyContext)}</li>
              <li>sourceRefPresent: {String(row.metrics.sourceRefPresent)}</li>
              <li>comparableMetricResolved: {String(row.metrics.comparableMetricResolved)}</li>
              <li>strongPage: {String(row.strongPage)}</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-2">All issues</h3>
            {['error', 'warning', 'info'].map(sev => {
              const list =
                sev === 'error' ? grouped.errs : sev === 'warning' ? grouped.warns : grouped.infos
              if (list.length === 0) return null
              return (
                <div key={sev} className="mb-3">
                  <p className="text-xs font-medium text-text capitalize mb-1">{sev}</p>
                  <ul className="space-y-2">
                    {list.map((i, idx) => (
                      <li
                        key={`${i.code}-${idx}`}
                        className={cn(
                          'text-xs rounded border p-2',
                          isHighVisibilityIssue(i.code) ? 'border-primary/40 bg-primary-soft/20' : 'border-border bg-bg'
                        )}
                      >
                        <span className="font-mono text-text">{i.code}</span>
                        {i.section && (
                          <span className="text-text-muted ml-2">{i.section}</span>
                        )}
                        {i.metricKey && (
                          <span className="text-text-muted ml-1">({i.metricKey})</span>
                        )}
                        <p className="text-text-muted mt-1">{i.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-text">Manual override</h3>
            <label className="block text-sm">
              <span className="text-text-muted">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2"
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value as OverrideStatus)}
              >
                <option value="use_validator">Use validator</option>
                <option value="publish">Publish (force)</option>
                <option value="hold">Hold (force)</option>
                <option value="review">Review queue</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-text-muted">Reason (short)</span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-text-muted">Notes</span>
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
              {saving ? 'Saving…' : 'Save override'}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
