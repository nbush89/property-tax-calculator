'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface AccordionItemProps {
  /** Trigger label (shown when closed) */
  title: string
  /** Panel content */
  children: React.ReactNode
  /** Optional: open by default */
  defaultOpen?: boolean
  className?: string
  /** Optional: heading level for the trigger (default: use a span, not a heading) */
  headingLevel?: 2 | 3 | 4
}

/**
 * Single accordion item using native <details>/<summary>.
 * Accessible, no JS required for expand/collapse, content remains in DOM for SEO.
 */
export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  className,
  headingLevel,
}: AccordionItemProps) {
  const Trigger = headingLevel ? (`h${headingLevel}` as keyof JSX.IntrinsicElements) : 'span'

  return (
    <details
      className={cn('group rounded-lg border border-border bg-surface', className)}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-left font-semibold text-text hover:bg-bg/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <Trigger className="m-0">{title}</Trigger>
        <span
          className="shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-border px-4 py-3 text-text-muted">{children}</div>
    </details>
  )
}
