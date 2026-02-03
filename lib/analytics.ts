/**
 * Shared analytics helper for GA4 and Microsoft Clarity.
 * No-op when env vars are missing or in non-browser context.
 * Never throws if gtag/clarity are undefined.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

type AnalyticsParams = Record<string, any> & {
  state?: string
  county?: string
  town?: string
  page_type?: 'town' | 'county' | 'state' | 'calculator' | 'blog' | 'static'
  tier?: 'tier1' | 'tier2' | 'tier3'
}

/**
 * Fire a custom event to GA4 and set Clarity tags when relevant params are provided.
 */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (!isBrowser()) return

  // GA4 event
  if (GA_ID && typeof window.gtag === 'function') {
    try {
      window.gtag('event', name, params ?? {})
    } catch {
      // no-op
    }
  }

  // Clarity tags (helps filtering session replays & heatmaps)
  if (CLARITY_ID && typeof window.clarity === 'function' && params) {
    try {
      if (typeof params.state === 'string') window.clarity('set', 'state', params.state)
      if (typeof params.county === 'string') window.clarity('set', 'county', params.county)
      if (typeof params.town === 'string') window.clarity('set', 'town', params.town)
      if (typeof params.page_type === 'string') window.clarity('set', 'page_type', params.page_type)
      if (typeof params.tier === 'string') window.clarity('set', 'tier', params.tier)
    } catch {
      // no-op
    }
  }
}

/**
 * Send a page view to GA4 (client-side navigation).
 * Call this only when the URL changes via App Router navigation.
 */
export function trackPageView(path: string): void {
  if (!isBrowser()) return

  if (GA_ID && typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      })
    } catch {
      // no-op
    }
  }
}
