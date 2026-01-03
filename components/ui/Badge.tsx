import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'neutral' | 'success' | 'info'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-bg text-text-muted border-border',
  success: 'bg-success-soft text-success border-success/20',
  info: 'bg-primary-soft text-primary border-primary/20',
}

export default function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

