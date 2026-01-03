/**
 * Single source of truth for site configuration.
 * Used across metadata, JSON-LD, and canonical URLs.
 */
export const SITE_NAME = "NJ Property Tax Calculator";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://home-property-tax.com";
// Use logo-icon.png as it's more suitable for structured data (square format)
export const LOGO_URL = `${SITE_URL}/logo-icon.png`;
