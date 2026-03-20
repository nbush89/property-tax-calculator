'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  getCalculatorAdjustablePrograms,
  getInformationalPrograms,
  hasCalculatorAdjustableRelief,
  hasInformationalReliefPrograms,
} from '@/lib/relief/stateReliefConfigs'
import type { SelectedReliefInputs } from '@/lib/relief/types'

type Props = {
  stateSlug: string
  reliefSelections: SelectedReliefInputs
  onToggleProgram: (programId: string, checked: boolean) => void
}

export function ReliefProgramsCalculatorSection({ stateSlug, reliefSelections, onToggleProgram }: Props) {
  const [open, setOpen] = useState(false)
  const adjustable = getCalculatorAdjustablePrograms(stateSlug)
  const informational = getInformationalPrograms(stateSlug)
  const show =
    hasCalculatorAdjustableRelief(stateSlug) || hasInformationalReliefPrograms(stateSlug)
  if (!show) return null

  const activeAdjustable = adjustable.filter(p => reliefSelections[p.id] === true).length

  return (
    <div className="rounded-xl border border-border bg-bg/50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-text"
        aria-expanded={open}
      >
        <span>Exemptions and tax relief</span>
        <span className="flex items-center gap-2 text-xs font-normal text-text-muted">
          {activeAdjustable > 0 ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">
              {activeAdjustable} applied in estimate
            </span>
          ) : (
            <span>Optional</span>
          )}
          <span className="text-text-muted">{open ? '▼' : '▶'}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-2 text-sm">
          {adjustable.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                Included in estimate (when selected)
              </p>
              <ul className="space-y-3">
                {adjustable.map(p => (
                  <li
                    key={p.id}
                    className={cn(
                      'rounded-lg border border-border bg-surface p-3',
                      reliefSelections[p.id] && 'border-primary/40 bg-primary-soft/20'
                    )}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={reliefSelections[p.id] === true}
                        onChange={e => onToggleProgram(p.id, e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>
                        <span className="font-medium text-text">{p.name}</span>
                        <span className="ml-2 inline-block rounded bg-success-soft/50 px-1.5 py-0.5 text-xs text-success">
                          In estimate
                        </span>
                        <p className="mt-1 text-text-muted">{p.description}</p>
                        {p.effectDescription && (
                          <p className="mt-1 text-xs text-text">{p.effectDescription}</p>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {informational.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                Not included in estimate — context only
              </p>
              <ul className="space-y-2">
                {informational.map(p => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-dashed border-border bg-surface/80 p-3 text-text-muted"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text">{p.name}</span>
                      <span className="rounded bg-bg px-1.5 py-0.5 text-xs">Informational</span>
                    </div>
                    <p className="mt-1">{p.description}</p>
                    {p.learnMoreUrl && (
                      <a
                        href={p.learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-primary hover:underline"
                      >
                        {p.learnMoreLabel ?? 'Learn more'} →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
