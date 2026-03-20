/**
 * Practical title/meta/H1 checks for CTR tuning (not academic SEO scoring).
 */

import type { SeoEntityType } from './types'

export type MetadataDiagnosticSeverity = 'error' | 'warning' | 'info'

export type MetadataDiagnostic = {
  code: string
  severity: MetadataDiagnosticSeverity
  message: string
  currentValue?: string
  recommendation?: string
}

export type MetadataPresentation = {
  title: string
  description: string
  h1: string | null
}

const TITLE_SHORT = 25
const TITLE_LONG = 65
const DESC_SHORT = 70
const DESC_LONG = 165

function hasLocality(
  title: string,
  description: string,
  hints: { stateName: string; abbrev: string; countyName?: string; townDisplay?: string }
): boolean {
  const blob = `${title} ${description}`.toLowerCase()
  const check = [
    hints.stateName.toLowerCase(),
    hints.abbrev.toLowerCase(),
    hints.countyName?.toLowerCase(),
    hints.townDisplay?.toLowerCase(),
  ].filter(Boolean) as string[]
  return check.some(c => c.length > 1 && blob.includes(c))
}

function hasCalculatorIntent(text: string, entityType: SeoEntityType, pathHint: string): boolean {
  const t = text.toLowerCase()
  if (t.includes('calculator') || t.includes('estimate')) return true
  if (pathHint.includes('property-tax-rates') && (t.includes('rate') || t.includes('rates'))) return true
  return false
}

function hasYear(text: string): boolean {
  return /\b20[12]\d\b/.test(text)
}

/**
 * Run diagnostic rules against resolved presentation + entity context.
 */
export function auditMetadataPresentation(
  presentation: MetadataPresentation,
  ctx: {
    entityType: SeoEntityType
    stateName: string
    stateAbbrev: string
    countyName?: string
    townDisplay?: string
    path: string
    /** If you intentionally put year in titles for this entity class */
    expectYearInTitle?: boolean
  }
): MetadataDiagnostic[] {
  const issues: MetadataDiagnostic[] = []
  const { title, description, h1 } = presentation

  if (!title?.trim()) {
    issues.push({
      code: 'TITLE_MISSING',
      severity: 'error',
      message: 'Title is empty',
      recommendation: 'Set a unique title in generateMetadata for this route.',
    })
  } else {
    if (title.length < TITLE_SHORT) {
      issues.push({
        code: 'TITLE_SHORT',
        severity: 'warning',
        message: `Title is short (${title.length} chars)`,
        currentValue: title,
        recommendation: 'Add locality, intent (calculator/rates), or year where accurate.',
      })
    }
    if (title.length > TITLE_LONG) {
      issues.push({
        code: 'TITLE_LONG',
        severity: 'warning',
        message: `Title may truncate in SERP (${title.length} chars)`,
        currentValue: title,
        recommendation: 'Tighten to ~50–60 chars; lead with town/county + intent.',
      })
    }
    if (
      !hasLocality(title, '', {
        stateName: ctx.stateName,
        abbrev: ctx.stateAbbrev,
        countyName: ctx.countyName,
        townDisplay: ctx.townDisplay,
      })
    ) {
      issues.push({
        code: 'TITLE_LOCALITY_WEAK',
        severity: 'warning',
        message: 'Title may not clearly include state/county/town',
        currentValue: title,
        recommendation: `Include ${ctx.townDisplay ?? ctx.countyName ?? ctx.stateName} or ${ctx.stateAbbrev}.`,
      })
    }
    if (!hasCalculatorIntent(title, ctx.entityType, ctx.path) && ctx.entityType !== 'state') {
      issues.push({
        code: 'TITLE_INTENT_WEAK',
        severity: 'info',
        message: 'Title may not convey calculator/estimate intent',
        currentValue: title,
        recommendation: 'Add “property tax calculator” or “estimates” where accurate.',
      })
    }
    if (ctx.expectYearInTitle && !hasYear(title)) {
      issues.push({
        code: 'TITLE_YEAR',
        severity: 'info',
        message: 'Strategy: consider data year in title when metrics are year-specific',
        currentValue: title,
        recommendation: 'Add the primary metric year if it improves clarity.',
      })
    }
  }

  if (!description?.trim()) {
    issues.push({
      code: 'META_DESC_MISSING',
      severity: 'error',
      message: 'Meta description is empty',
    })
  } else {
    if (description.length < DESC_SHORT) {
      issues.push({
        code: 'META_DESC_SHORT',
        severity: 'warning',
        message: `Meta description is short (${description.length} chars)`,
        currentValue: description,
        recommendation: 'Expand to ~120–155 chars with locality + action (calculate, compare, view rates).',
      })
    }
    if (description.length > DESC_LONG) {
      issues.push({
        code: 'META_DESC_LONG',
        severity: 'info',
        message: `Meta description is long (${description.length} chars)`,
        currentValue: description,
        recommendation: 'Google may truncate; front-load locality and CTA.',
      })
    }
    if (
      !hasLocality('', description, {
        stateName: ctx.stateName,
        abbrev: ctx.stateAbbrev,
        countyName: ctx.countyName,
        townDisplay: ctx.townDisplay,
      })
    ) {
      issues.push({
        code: 'META_LOCALITY_WEAK',
        severity: 'warning',
        message: 'Description may lack clear locality',
        currentValue: description,
        recommendation: 'Name the town/county/state early.',
      })
    }
    const d = description.toLowerCase()
    if (
      !d.includes('calculat') &&
      !d.includes('estimate') &&
      !d.includes('rate') &&
      !d.includes('explore')
    ) {
      issues.push({
        code: 'META_ACTION_WEAK',
        severity: 'info',
        message: 'Description could use a stronger action verb',
        currentValue: description,
        recommendation: 'Use “calculate”, “estimate”, “compare”, or “view rates”.',
      })
    }
  }

  if (h1 != null && title && h1.trim() && !title.toLowerCase().includes(h1.toLowerCase().slice(0, 12))) {
    issues.push({
      code: 'H1_TITLE_DRIFT',
      severity: 'info',
      message: 'H1 and title differ substantially (can be OK)',
      currentValue: `H1: ${h1}`,
      recommendation: 'Align primary query terms across title and H1 when possible.',
    })
  }

  return issues
}

export function summarizeDiagnostics(issues: MetadataDiagnostic[]): string {
  const w = issues.filter(i => i.severity === 'warning' || i.severity === 'error').length
  if (w === 0 && issues.length === 0) return 'OK'
  if (w === 0) return `${issues.length} info`
  return `${w} warn/error${issues.length > w ? ` +${issues.length - w} info` : ''}`
}
