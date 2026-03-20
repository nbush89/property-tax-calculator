import Link from 'next/link'
import { getStateReliefConfig } from '@/lib/relief/stateReliefConfigs'
import { getCountyReliefProgramGroups } from '@/lib/relief/groupReliefPrograms'
import {
  buildCountyReliefIntro,
  buildReliefMethodologySummary,
} from '@/lib/relief/presentationCopy'
import type { ReliefProgram } from '@/lib/relief/types'

type Props = {
  stateSlug: string
  countyDisplayName: string
}

function CountyProgramItem({
  program,
  inCalculator,
}: {
  program: ReliefProgram
  inCalculator: boolean
}) {
  return (
    <li className="rounded-lg border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-text">{program.name}</span>
        {inCalculator ? (
          <span className="rounded bg-success-soft/40 px-2 py-0.5 text-xs text-success">
            May adjust estimate
          </span>
        ) : (
          <span className="rounded bg-bg px-2 py-0.5 text-xs text-text-muted border border-border">
            Not in estimate
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-text-muted">{program.description}</p>
      {program.effectDescription && (
        <p className="mt-2 text-xs text-text">{program.effectDescription}</p>
      )}
      {program.learnMoreUrl && (
        <a
          href={program.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          {program.learnMoreLabel ?? 'Official source'} →
        </a>
      )}
    </li>
  )
}

/**
 * County tier: medium depth, localized framing; links up to state hub.
 */
export function CountyReliefSection({ stateSlug, countyDisplayName }: Props) {
  const config = getStateReliefConfig(stateSlug)
  const groups = getCountyReliefProgramGroups(config)
  if (!groups || !config) return null

  const encState = encodeURIComponent(stateSlug)
  const intro = buildCountyReliefIntro(config.stateName, countyDisplayName)
  const methodology = buildReliefMethodologySummary(config.stateName, 'county')

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-6 md:p-7"
      aria-labelledby="county-relief-heading"
    >
      <h2 id="county-relief-heading" className="text-xl font-semibold text-text md:text-2xl">
        Property tax exemptions and relief in {config.stateName} ({countyDisplayName} County)
      </h2>
      <p className="mt-3 text-sm text-text-muted leading-relaxed">{intro}</p>

      {groups.calculatorAdjustable.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Can adjust your estimate (simplified)
          </h3>
          <ul className="mt-3 space-y-3">
            {groups.calculatorAdjustable.map(p => (
              <CountyProgramItem key={p.id} program={p} inCalculator />
            ))}
          </ul>
        </div>
      )}

      {groups.informational.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Other state programs (context)
          </h3>
          <ul className="mt-3 space-y-3">
            {groups.informational.map(p => (
              <CountyProgramItem key={p.id} program={p} inCalculator={false} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs text-text-muted border-t border-border pt-4">{methodology}</p>

      <p className="mt-4">
        <Link
          href={`/${encState}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View full {config.stateName} relief program details →
        </Link>
      </p>
    </section>
  )
}
