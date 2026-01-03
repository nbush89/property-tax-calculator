import React from 'react'
import { cn } from '@/lib/utils'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-border bg-surface px-4 py-2 text-text',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 focus:border-primary',
        'disabled:bg-bg disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

