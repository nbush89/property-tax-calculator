'use client'

import { useEffect, useRef, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

/**
 * Tracks client-side navigation page views for GA4.
 * Does not fire on initial load (GA4 script in Analytics.tsx sends initial page_path)
 * to avoid double-counting.
 */
export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string | null>(null)

  const queryString = searchParams?.toString() ?? ''

  const path = useMemo(() => {
    return queryString ? `${pathname}?${queryString}` : pathname
  }, [pathname, queryString])

  useEffect(() => {
    if (!path) return

    // Skip initial mount to avoid double-counting the first pageview
    if (lastPathRef.current === null) {
      lastPathRef.current = path
      return
    }

    // Track only on actual client-side navigation changes
    if (lastPathRef.current !== path) {
      lastPathRef.current = path
      trackPageView(path)
    }
  }, [path])

  return null
}
