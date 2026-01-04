/**
 * Utility functions for location slug generation and data access
 */

/**
 * Convert a location name to a URL-friendly slug
 * e.g., "Bergen County" -> "bergen-county"
 */
export function slugifyLocation(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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

