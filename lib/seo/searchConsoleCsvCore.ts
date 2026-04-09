/**
 * Shared CSV primitives for Search Console exports (queries + landing pages).
 */

export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, ' ')
}

export function parseIntSafe(s: string): number | null {
  const n = Number.parseInt(s.replace(/,/g, '').replace(/\s/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export function parseFloatSafe(s: string): number | null {
  const n = Number.parseFloat(s.replace(/,/g, '').replace(/\s/g, ''))
  return Number.isFinite(n) ? n : null
}

/** CTR as 0–1 fraction */
export function parseCtr(raw: string): number | null {
  const s = raw.trim()
  if (s.endsWith('%')) {
    const n = parseFloatSafe(s.slice(0, -1))
    if (n == null) return null
    return Math.max(0, Math.min(1, n / 100))
  }
  const n = parseFloatSafe(s)
  if (n == null) return null
  if (n > 1 && n <= 100) return n / 100
  return Math.max(0, Math.min(1, n))
}
