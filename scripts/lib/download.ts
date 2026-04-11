/**
 * Shared HTTP download utility for state-metrics scripts.
 *
 * All scripts (NJ GTR, NJ MOD IV, TX Comptroller) had identical inline copies
 * of this function. Centralised here so retry logic, User-Agent, and error
 * semantics stay consistent across sources.
 */
import * as https from 'node:https'

export type DownloadOptions = {
  /** User-Agent header sent with the request. */
  userAgent?: string
}

/**
 * Download a URL to a Buffer.
 *
 * - Rejects with `Error('NOT_FOUND')` on HTTP 404 so callers can distinguish
 *   "file doesn't exist yet" from generic network failures.
 * - Rejects with `Error('HTTP <code>')` for other non-2xx responses.
 */
export function downloadBuffer(url: string, options: DownloadOptions = {}): Promise<Buffer> {
  const userAgent = options.userAgent ?? 'state-metrics-script/1.0'
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': userAgent } }, res => {
        const code = res.statusCode ?? 0
        if (code === 404) {
          res.resume()
          reject(new Error('NOT_FOUND'))
          return
        }
        if (code < 200 || code >= 300) {
          res.resume()
          reject(new Error(`HTTP ${code} for ${url}`))
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer | string) =>
          chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
        )
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

/**
 * Try each URL in order, returning the first successful download.
 * Useful for year-fallback patterns (e.g. try 2025 PDF, then 2024, then 2023).
 */
export async function tryDownloadFirst(
  urls: string[],
  options: DownloadOptions = {}
): Promise<Buffer> {
  const errors: string[] = []
  for (const u of urls) {
    try {
      return await downloadBuffer(u, options)
    } catch (e) {
      errors.push(`${u}: ${String(e)}`)
    }
  }
  throw new Error(`All download attempts failed:\n${errors.join('\n')}`)
}
