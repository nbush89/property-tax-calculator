/**
 * HB 581 opt-out explainer for Georgia counties.
 *
 * House Bill 581 (the "Save Our Homes Act") took effect January 1, 2025 and
 * created a statewide floating homestead exemption that caps annual increases
 * in a homestead's assessed value at the rate of inflation (CPI).
 *
 * Counties (and their school districts) were given the option to opt out via
 * public hearings and a formal resolution. Most large metropolitan counties
 * opted out, including all four in our GA launch set (Fulton, DeKalb,
 * Gwinnett, Cobb).
 *
 * This is a high-volume search topic in 2025-2026 — "did my county opt out
 * of HB 581" type queries — and a real SEO opportunity.
 *
 * Renders nothing for non-Georgia states.
 */

import { Divider } from '@/components/ui/Divider'

interface Hb581Props {
  stateSlug: string
  countyName: string
  /**
   * When true, render as a callout card without the full-width section
   * wrapper — intended for use inside the two-zone grid's prose column.
   * When false (default), render as a full-width page section.
   */
  inline?: boolean
}

/**
 * Opt-out status per county (as of tax year 2025). All four metro counties +
 * their school districts opted out. Update this map if any county reverses
 * its position in future years.
 *
 * Counties not listed here are treated as either:
 *  - Opted in (HB 581 floating homestead applies) — most rural GA counties
 *  - Unknown / not yet researched
 */
const HB581_OPT_OUT: Record<string, { county: boolean; school: boolean; effectiveYear: number }> = {
  Fulton: { county: true, school: true, effectiveYear: 2025 },
  DeKalb: { county: true, school: true, effectiveYear: 2025 },
  Gwinnett: { county: true, school: true, effectiveYear: 2025 },
  Cobb: { county: true, school: true, effectiveYear: 2025 },
}

export default function Hb581ExplainerSection({
  stateSlug,
  countyName,
  inline = false,
}: Hb581Props) {
  if (stateSlug !== 'georgia') return null
  const status = HB581_OPT_OUT[countyName]
  if (!status) return null // Only render for counties we've explicitly researched

  const bothOptedOut = status.county && status.school
  const headingId = `hb581-${countyName.toLowerCase()}`

  const Body = (
    <>
      <div className="mb-3">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
          Policy update
        </span>
      </div>
      <h3 id={headingId} className="text-xl font-semibold text-text mb-3">
        HB 581 floating homestead exemption — {countyName} County opted out
      </h3>
      <div className="space-y-4 text-sm text-text-muted leading-relaxed">
            <p>
              Georgia House Bill 581, the &ldquo;Save Our Homes Act,&rdquo; took
              effect January 1, 2025. It creates a statewide floating homestead
              exemption that caps annual increases in a homestead&rsquo;s
              taxable value at the rate of inflation (CPI). The law was framed
              as protection against rapid assessment growth in hot real-estate
              markets.
            </p>

            <p>
              <span className="font-medium text-text">
                {countyName} County opted out.
              </span>{' '}
              {bothOptedOut ? (
                <>
                  Both {countyName} County government and {countyName} County
                  Schools formally opted out of HB 581 for tax year{' '}
                  {status.effectiveYear}, citing concerns about long-term
                  revenue stability and the lack of a state reimbursement
                  mechanism.
                </>
              ) : status.county ? (
                <>
                  {countyName} County government opted out, but the school
                  district remains opted in. Check with the {countyName} County
                  Board of Tax Assessors for the latest status.
                </>
              ) : (
                <>
                  {countyName} County Schools opted out, but the county
                  government remains opted in. Check with the {countyName}{' '}
                  County Board of Tax Assessors for the latest status.
                </>
              )}
            </p>

            <p>
              <span className="font-medium text-text">
                What this means for {countyName} County homeowners:
              </span>{' '}
              the HB 581 cap on annual taxable-value growth does not apply.
              Assessed values can rise with market appreciation, subject to the
              standard 40% assessment ratio. The traditional $2,000 statewide
              homestead exemption still applies for primary residences, and
              any local senior, disability, or floating homestead exemptions
              you qualified for before HB 581 also remain in effect.
            </p>

      <p>
        <span className="font-medium text-text">
          What to verify yourself:
        </span>{' '}
        opt-out decisions can be revisited in future years through the
        same public hearing process. If a future legislative session
        changes the framework or {countyName} County reverses its
        position, the floating homestead would apply going forward. Check
        the {countyName} County Board of Tax Assessors site each spring
        before assessment notices go out.
      </p>
      </div>
    </>
  )

  if (inline) {
    return (
      <div
        className="mt-8 mb-8 rounded-xl border border-amber-200 bg-amber-50/40 p-5"
        aria-labelledby={headingId}
      >
        {Body}
      </div>
    )
  }

  return (
    <>
      <Divider />
      <section aria-labelledby={headingId} className="py-8 bg-bg">
        <div className="container-content">
          <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50/40 p-5">
            {Body}
          </div>
        </div>
      </section>
    </>
  )
}

/** Used by the FAQ snippet builders and page metadata where helpful. */
export function getHb581Status(stateSlug: string, countyName: string) {
  if (stateSlug !== 'georgia') return null
  return HB581_OPT_OUT[countyName] ?? null
}
