'use client'

import type { MetricComparability, MetricSemantics } from '@/lib/metrics/capabilityTypes'

type MetricCaveatTriggerProps = {
  semantics?: MetricSemantics
  comparability?: MetricComparability
  note?: string
  catalogCaveat?: string
  className?: string
}

/**
 * Compact info control: surfaces state-specific notes / comparability without cluttering layout.
 * Uses native title tooltip; can be upgraded to a popover later.
 */
export function MetricCaveatTrigger({
  semantics,
  comparability,
  note,
  catalogCaveat,
  className = '',
}: MetricCaveatTriggerProps) {
  const parts: string[] = []
  if (note) parts.push(note)
  if (catalogCaveat && !note?.includes(catalogCaveat)) parts.push(catalogCaveat)
  if (semantics && semantics !== 'standard') {
    parts.push(
      semantics === 'state_specific'
        ? 'State-specific definition.'
        : semantics === 'derived'
          ? 'Derived / modeled metric.'
          : 'Estimated metric.'
    )
  }
  if (comparability && comparability !== 'high') {
    parts.push(
      comparability === 'low'
        ? 'Low cross-state comparability.'
        : 'Moderate cross-state comparability.'
    )
  }

  const title = parts.filter(Boolean).join(' ')
  if (!title) return null

  return (
    <span
      className={`inline-flex items-center justify-center align-middle text-text-muted ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 ml-1 opacity-70 hover:opacity-100 cursor-help"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  )
}
