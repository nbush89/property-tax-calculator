'use client'

import Link from 'next/link'
import Logo from './Logo'
import { LinkButton } from '@/components/ui/Button'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { trackEvent } from '@/lib/analytics'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between">
          <Logo />

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/new-jersey/property-tax-calculator"
              className="text-sm font-medium text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              Calculator
            </Link>
            <Link
              href="/new-jersey/property-tax-rates"
              className="text-sm font-medium text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              Rates
            </Link>
            <Link
              href="/faq"
              className="text-sm font-medium text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LinkButton
              href="/new-jersey/property-tax-calculator"
              variant="primary"
              size="sm"
              onClick={() =>
                trackEvent('cta_calculate_click', { state: 'NJ', page_type: 'calculator' })
              }
            >
              Calculate now
            </LinkButton>
          </div>
        </div>
      </div>
    </header>
  )
}
