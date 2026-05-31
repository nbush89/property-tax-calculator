/**
 * Exemptions CTA section for county pages.
 *
 * Surfaces an affiliate link for property tax exemption review (Ownwell). Year-
 * round relevance, unlike appeals which has a tight seasonal window. Renders
 * only when the state's affiliate config has an `exemptionsCta` and it's
 * enabled — otherwise returns null.
 */

import {
  appendSid,
  getStateAffiliateConfig,
} from '@/lib/affiliates/affiliateConfig'
import { Divider } from '@/components/ui/Divider'
import { slugifyLocation } from '@/utils/locationUtils'

interface Props {
  stateSlug: string
  countyName: string
  /**
   * When true, render as a callout card without the full-width section
   * wrapper — intended for use inside the two-zone grid's prose column.
   */
  inline?: boolean
}

export function ExemptionsCtaSection({ stateSlug, countyName, inline = false }: Props) {
  const config = getStateAffiliateConfig(stateSlug)
  const cta = config.exemptionsCta
  if (!cta?.enabled) return null

  const sid = `${stateSlug}-${slugifyLocation(countyName)}-exemptions`
  const href = appendSid(cta.url, sid)
  const headingId = `exemptions-cta-${slugifyLocation(countyName)}`

  const Card = (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <h3 id={headingId} className="text-lg font-semibold text-text mb-2">
        Could exemptions lower your {countyName} County bill?
      </h3>
      <p className="text-sm text-text-muted mb-3">{cta.description}</p>
      <a
        href={href}
        target={cta.external ? '_blank' : undefined}
        rel={cta.external ? 'noopener noreferrer sponsored' : undefined}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      >
        {cta.label}
      </a>
    </div>
  )

  if (inline) {
    return <div className="mt-6 mb-8">{Card}</div>
  }

  return (
    <>
      <Divider />
      <section aria-labelledby={headingId} className="py-8 bg-bg">
        <div className="container-content">
          <div className="max-w-3xl">{Card}</div>
        </div>
      </section>
    </>
  )
}
