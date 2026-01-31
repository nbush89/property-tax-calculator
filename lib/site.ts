/**
 * Single source of truth for site configuration.
 * Used across metadata, JSON-LD, breadcrumbs, and canonical URLs.
 * In development, defaults to localhost when NEXT_PUBLIC_SITE_URL is not set.
 */
const PRODUCTION_URL = 'https://www.home-property-tax.com'
const DEV_DEFAULT_URL = 'http://localhost:3000'

export const SITE_NAME = 'NJ Property Tax Calculator'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'development' ? DEV_DEFAULT_URL : PRODUCTION_URL)

// Use logo-icon.png as it's more suitable for structured data (square format)
export const LOGO_URL = `${SITE_URL}/logo-icon.png`
