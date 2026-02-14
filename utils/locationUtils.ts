/**
 * Utility functions for location slug generation and data access.
 * Single canonical slug function used everywhere for consistent URLs and SEO.
 */

/**
 * Convert a location name to a URL-friendly slug.
 * Used for counties, towns, and municipalities. Lower-case, trim, spaces to hyphens, no punctuation.
 * Display names like "Atlantic City" or "Washington Township" stay readable; slug is stable (e.g. atlantic-city, washington-township).
 * e.g. "Bergen County" -> "bergen-county", "Atlantic City" -> "atlantic-city"
 */
export function slugifyLocation(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Alias for slugifyLocation for town/municipality names. Same rules; use for clarity at call sites.
 */
export function slugifyTown(name: string): string {
  return slugifyLocation(name)
}

/**
 * Convert a slug back to a display name
 * e.g., "bergen-county" -> "Bergen County"
 */
export function unslugifyLocation(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Remove "County" suffix from slug if present
 * e.g., "bergen-county" -> "bergen"
 */
export function removeCountySuffix(slug: string): string {
  return slug.replace(/-county$/, '')
}

/**
 * Add "County" suffix to slug if not present
 * e.g., "bergen" -> "bergen-county"
 */
export function addCountySuffix(slug: string): string {
  return slug.endsWith('-county') ? slug : `${slug}-county`
}

/**
 * Display name for a town: use displayName when set (e.g. "Lakewood Township"), otherwise name.
 */
export function getTownDisplayName(town: { name: string; displayName?: string }): string {
  return town.displayName ?? town.name
}
