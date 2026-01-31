/**
 * Runtime validation for Town Overview data.
 * Logs warnings in dev; does not throw or crash.
 */

import type { TownOverview } from './types'

function warn(msg: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn(`[TownOverview] ${msg}`)
  }
}

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === 'number' && !Number.isNaN(n) && n >= 0
}

/**
 * Validate overview object. Returns true if valid or safe to use; logs warnings for invalid fields.
 */
export function validateTownOverview(overview: unknown): overview is TownOverview {
  if (overview == null || typeof overview !== 'object') {
    return false
  }

  const o = overview as Record<string, unknown>

  if (typeof o.asOfYear !== 'number' || Number.isNaN(o.asOfYear)) {
    warn('overview.asOfYear is required and must be a number')
    return false
  }

  const year = o.asOfYear as number
  if (year < 2000 || year > 2030) {
    warn(`overview.asOfYear (${year}) is outside expected range`)
  }

  if (o.avgResidentialTaxBill != null && !isNonNegativeNumber(o.avgResidentialTaxBill)) {
    warn('overview.avgResidentialTaxBill must be a non-negative number')
  }
  if (o.effectiveTaxRatePct != null && !isNonNegativeNumber(o.effectiveTaxRatePct)) {
    warn('overview.effectiveTaxRatePct must be a non-negative number')
  }
  if (o.countyAvgTaxBill != null && !isNonNegativeNumber(o.countyAvgTaxBill)) {
    warn('overview.countyAvgTaxBill must be a non-negative number')
  }
  if (o.stateAvgTaxBill != null && !isNonNegativeNumber(o.stateAvgTaxBill)) {
    warn('overview.stateAvgTaxBill must be a non-negative number')
  }
  if (o.typicalHomeValue != null && !isNonNegativeNumber(o.typicalHomeValue)) {
    warn('overview.typicalHomeValue must be a non-negative number')
  }

  if (o.trend5y != null && typeof o.trend5y === 'object') {
    const t = o.trend5y as Record<string, unknown>
    if (typeof t.startYear !== 'number' || typeof t.endYear !== 'number') {
      warn('overview.trend5y.startYear and endYear must be numbers')
    }
    if (t.pctChange != null && typeof t.pctChange !== 'number') {
      warn('overview.trend5y.pctChange must be a number')
    }
  }

  if (Array.isArray(o.notes)) {
    const bad = o.notes.some(n => typeof n !== 'string')
    if (bad) warn('overview.notes must be an array of strings')
  }

  if (Array.isArray(o.sources)) {
    const bad = o.sources.some(
      s =>
        typeof s !== 'object' ||
        s === null ||
        typeof (s as Record<string, unknown>).name !== 'string'
    )
    if (bad) warn('overview.sources must be an array of { name: string, url?, retrieved? }')
  }

  return true
}
