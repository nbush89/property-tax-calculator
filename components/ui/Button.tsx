import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

type BaseButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  className?: string
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & BaseButtonProps

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
  secondary: 'border-2 border-border bg-surface text-text hover:bg-bg focus:ring-primary',
  ghost: 'text-text hover:bg-bg focus:ring-primary',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-8 py-4 text-base',
}

export const baseClasses = (
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string
) =>
  cn(
    'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    variantStyles[variant],
    sizeStyles[size],
    className
  )

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={baseClasses(variant, size, className)} {...props}>
      {children}
    </button>
  )
}

// Export a LinkButton component for Next.js Link usage
export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: BaseButtonProps & { href: string } & React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={baseClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  )
}
