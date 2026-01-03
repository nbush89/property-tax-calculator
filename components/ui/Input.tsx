import React from 'react'
import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-border bg-surface px-4 py-2 text-text',
        'placeholder:text-text-muted',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 focus:border-primary',
        'disabled:bg-bg disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

