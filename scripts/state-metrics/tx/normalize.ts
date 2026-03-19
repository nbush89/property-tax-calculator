/**
 * Normalize Texas Comptroller workbook names for matching to geo JSON (county/town names).
 */

export function normalizeTexasCountyKey(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+county$/i, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

export function normalizeTexasCityKey(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
