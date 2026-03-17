'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { baseClasses } from '@/components/ui/Button'

type CtaCalculateLinkProps = {
  href: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  pageType: 'state' | 'county' | 'town' | 'calculator'
  state?: string
  county?: string
  town?: string
  tier?: 'tier1' | 'tier2' | 'tier3'
  children: React.ReactNode
  className?: string
}

/**
 * Link that fires cta_calculate_click on click for analytics.
 * Use for major "Calculate" CTAs outside the header.
 */
export function CtaCalculateLink({
  href,
  variant = 'primary',
  size = 'lg',
  pageType,
  state,
  county,
  town,
  tier,
  children,
  className,
}: CtaCalculateLinkProps) {
  return (
    <Link
      href={href}
      className={baseClasses(variant, size, className)}
      onClick={() =>
        trackEvent('cta_calculate_click', {
          page_type: pageType,
          ...(state && { state }),
          ...(county && { county }),
          ...(town && { town }),
          ...(tier && { tier }),
        })
      }
    >
      {children}
    </Link>
  )
}
