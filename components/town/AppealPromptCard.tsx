import { appendSid, getStateAffiliateConfig } from '@/lib/affiliates/affiliateConfig'
import { slugifyLocation } from '@/utils/locationUtils'

interface AppealPromptCardProps {
  stateSlug: string
  townDisplayName: string
  countyName?: string
}

/**
 * Informs users about the property tax appeal process and, when the affiliate
 * CTA is enabled, surfaces the Ownwell referral link.
 * Renders as static educational copy when the CTA is disabled.
 */
export function AppealPromptCard({
  stateSlug,
  townDisplayName,
  countyName,
}: AppealPromptCardProps) {
  const { appealCta } = getStateAffiliateConfig(stateSlug)
  const sid = countyName
    ? `${stateSlug}-${slugifyLocation(countyName)}-${slugifyLocation(townDisplayName)}`
    : `${stateSlug}-town-${slugifyLocation(townDisplayName)}`
  const href = appendSid(appealCta.url, sid)

  return (
    <section className="mb-8" aria-labelledby="appeal-prompt-heading">
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2
          id="appeal-prompt-heading"
          className="text-lg font-semibold text-text mb-2"
        >
          Is your {townDisplayName} assessment accurate?
        </h2>
        <p className="text-sm text-text-muted mb-3">
          If your home's assessed value is higher than its current market value, you may be
          overpaying property taxes. A successful appeal — filed with your county board of
          taxation — can reduce your assessed value and lower your annual bill.
        </p>
        {appealCta.enabled ? (
          <div>
            <a
              href={href}
              rel="noopener noreferrer sponsored"
              target="_blank"
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            >
              {appealCta.label}
            </a>
            <p className="text-xs text-text-muted mt-2">{appealCta.description}</p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Contact your local assessor&apos;s office or county board of taxation to learn
            about appeal deadlines and eligibility in your area.
          </p>
        )}
      </div>
    </section>
  )
}
