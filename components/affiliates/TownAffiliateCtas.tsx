/**
 * Contextual affiliate / referral CTAs for the town page.
 *
 * Placement: below TownAtAGlance, before the calculator — user has just seen
 * their tax numbers and is primed to act.
 *
 * All CTAs are config-driven and individually gated by `enabled`. No CTA
 * renders if both are disabled, so this component is safe to include on every
 * town page without visual clutter.
 */

import { getStateAffiliateConfig } from '@/lib/affiliates/affiliateConfig'
import type { AffiliateCta } from '@/lib/affiliates/affiliateConfig'

type Props = {
  stateSlug: string
  townDisplayName: string
}

function CtaCard({ cta }: { cta: AffiliateCta }) {
  if (!cta.enabled) return null
  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-muted leading-snug">{cta.description}</p>
      <a
        href={cta.url}
        target={cta.external ? '_blank' : undefined}
        rel={cta.external ? 'noopener noreferrer sponsored' : undefined}
        className="shrink-0 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
      >
        {cta.label}
      </a>
    </div>
  )
}

export function TownAffiliateCtas({ stateSlug }: Props) {
  const config = getStateAffiliateConfig(stateSlug)
  const hasAppeal = config.appealCta.enabled
  const hasMortgage = config.mortgageCta.enabled

  if (!hasAppeal && !hasMortgage) return null

  return (
    <div className="mb-6 flex flex-col gap-3" aria-label="Sponsored resources">
      <CtaCard cta={config.appealCta} />
      <CtaCard cta={config.mortgageCta} />
    </div>
  )
}
