import Link from 'next/link'
import { getStateReliefConfig } from '@/lib/relief/stateReliefConfigs'
import { getStateReliefProgramGroups } from '@/lib/relief/groupReliefPrograms'
import {
  buildStateReliefIntro,
  buildReliefMethodologySummary,
} from '@/lib/relief/presentationCopy'
import type { ReliefProgram } from '@/lib/relief/types'

type Props = {
  /** Route / data slug, e.g. new-jersey */
  stateSlug: string
}

function OfficialLink({ program }: { program: ReliefProgram }) {
  if (!program.learnMoreUrl) return null
  return (
    <a
      href={program.learnMoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-sm text-primary hover:underline"
    >
      {program.learnMoreLabel ?? 'Official source'} →
    </a>
  )
}

function StateProgramCard({
  program,
  badge,
}: {
  program: ReliefProgram
  badge: 'calculator' | 'billImpact' | 'explore'
}) {
  const badgeClass =
    badge === 'calculator'
      ? 'bg-success-soft/40 text-success'
      : badge === 'billImpact'
        ? 'bg-warning-soft/40 text-warning'
        : 'bg-bg text-text-muted border border-border'

  const badgeLabel =
    badge === 'calculator'
      ? 'Included in calculator (simplified)'
      : badge === 'billImpact'
        ? 'May affect actual taxes (not fully modeled)'
        : 'Additional programs to explore'

  return (
    <li className="rounded-xl border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold text-text">{program.name}</h4>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{badgeLabel}</span>
        <span className="rounded bg-bg px-2 py-0.5 text-xs text-text-muted">State-defined</span>
      </div>
      <p className="mt-2 text-sm text-text-muted">{program.description}</p>
      {program.effectDescription && (
        <p className="mt-2 text-sm font-medium text-text">{program.effectDescription}</p>
      )}
      {program.eligibilitySummary && program.eligibilitySummary.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-muted">
          {program.eligibilitySummary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {program.methodologyNote && (
        <p className="mt-3 text-xs text-text-muted border-t border-border pt-3">{program.methodologyNote}</p>
      )}
      <OfficialLink program={program} />
    </li>
  )
}

/**
 * Canonical state hub: deepest relief content, three-way informational grouping.
 */
export function StateReliefSection({ stateSlug }: Props) {
  const config = getStateReliefConfig(stateSlug)
  const groups = getStateReliefProgramGroups(config)
  if (!groups || !config) return null

  const enc = encodeURIComponent(stateSlug)
  const { lead, secondary } = buildStateReliefIntro(config.stateName)
  const methodology = buildReliefMethodologySummary(config.stateName, 'state')
  const hasCalculator = groups.calculatorAdjustable.length > 0

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-6 md:p-8"
      aria-labelledby="state-relief-heading"
    >
      <h2 id="state-relief-heading" className="text-xl font-semibold text-text md:text-2xl">
        Property tax exemptions and relief in {config.stateName}
      </h2>
      <div className="mt-4 space-y-3 text-sm text-text-muted leading-relaxed">
        <p>{lead}</p>
        <p>{secondary}</p>
      </div>

      {hasCalculator && (
        <div className="mt-8 rounded-lg border border-primary/25 bg-primary-soft/15 p-4 text-sm text-text">
          <p className="font-medium text-text">How this affects estimates on this site</p>
          <p className="mt-1 text-text-muted">
            When a program is marked as included in the calculator, you can opt in under
            &quot;Exemptions and tax relief&quot; on supported calculators. We still show published
            rates and apply honest simplifications—see{' '}
            <Link href="/methodology" className="text-primary hover:underline">
              methodology
            </Link>{' '}
            for limits.
          </p>
        </div>
      )}

      {groups.calculatorAdjustable.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Included in calculator (simplified)
          </h3>
          <ul className="mt-4 space-y-4">
            {groups.calculatorAdjustable.map(p => (
              <StateProgramCard key={p.id} program={p} badge="calculator" />
            ))}
          </ul>
        </div>
      )}

      {groups.informationalFilingOrBenefit.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            May affect what you pay or receive (not fully modeled)
          </h3>
          <p className="mt-2 text-xs text-text-muted">
            Rebate, freeze, and filing-based programs can change real tax burden but depend on
            eligibility and timing. They are not applied automatically in the estimate unless moved
            into the calculator group above.
          </p>
          <ul className="mt-4 space-y-4">
            {groups.informationalFilingOrBenefit.map(p => (
              <StateProgramCard key={p.id} program={p} badge="billImpact" />
            ))}
          </ul>
        </div>
      )}

      {groups.informationalOther.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Additional exemptions and programs to explore
          </h3>
          <ul className="mt-4 space-y-4">
            {groups.informationalOther.map(p => (
              <StateProgramCard key={p.id} program={p} badge="explore" />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 text-sm text-text-muted border-t border-border pt-6">{methodology}</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href={`/${enc}/property-tax-calculator`}
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          Use the {config.stateName} property tax calculator →
        </Link>
        <Link href="#counties" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
          Explore counties in {config.stateName} →
        </Link>
      </div>
    </section>
  )
}
