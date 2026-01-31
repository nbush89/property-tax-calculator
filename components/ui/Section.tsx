import React from 'react'
import { cn } from '@/lib/utils'

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  title?: string
  subtitle?: string
  /** Optional id for the section title (h2) for aria-labelledby */
  titleId?: string
}

export default function Section({
  title,
  subtitle,
  titleId,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn('py-12 sm:py-16 lg:py-20', className)} {...props}>
      <div className="container-page">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && (
              <h2 id={titleId} className="section-title">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-4 text-lg muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
