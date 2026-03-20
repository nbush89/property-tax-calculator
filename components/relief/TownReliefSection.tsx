import Link from 'next/link'
import { getStateReliefConfig } from '@/lib/relief/stateReliefConfigs'
import { getCountyReliefProgramGroups } from '@/lib/relief/groupReliefPrograms'
import { getTownReliefHighlights } from '@/lib/relief/getTownReliefHighlights'
import {
  buildTownReliefIntro,
  buildEstimateContextNote,
  buildReliefMethodologySummary,
} from '@/lib/relief/presentationCopy'
import type { ReliefProgram } from '@/lib/relief/types'

type Props = {
  stateSlug: string
  townDisplayName: string
  countyDisplayName: string
  /** County list URL segment, e.g. bergen-county-property-tax */
  countyPathSegment: string
}

function HighlightRow({ program }: { program: ReliefProgram }) {
  const inEst = program.modelingMode === 'calculator_adjustable'
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border bg-bg px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <span className="font-medium text-text">{program.shortName ?? program.name}</span>
        <p className="mt-1 text-xs text-text-muted line-clamp-3 sm:line-clamp-2">{program.description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        {inEst ? (
          <>
            <span className="rounded bg-success-soft/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success">
              Included in estimate
            </span>
            <span className="rounded bg-bg px-2 py-0.5 text-[10px] text-text-muted border border-border">
              Simplified
            </span>
          </>
        ) : (
          <span className="rounded bg-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted border border-border">
            Not directly included
          </span>
        )}
        <span className="rounded bg-surface px-2 py-0.5 text-[10px] text-text-muted">State-defined</span>
      </div>
    </li>
  )
}

/**
 * Town tier: compact, calculator-oriented; links up to county relief section.
 */
export function TownReliefSection({
  stateSlug,
  townDisplayName,
  countyDisplayName,
  countyPathSegment,
}: Props) {
  const config = getStateReliefConfig(stateSlug)
  const groups = getCountyReliefProgramGroups(config)
  if (!groups || !config) return null

  const highlights = getTownReliefHighlights(stateSlug, 3)
  if (highlights.length === 0) return null

  const encState = encodeURIComponent(stateSlug)
  const encCounty = encodeURIComponent(countyPathSegment)
  const hasAdj = groups.calculatorAdjustable.length > 0

  const intro = buildTownReliefIntro(config.stateName, townDisplayName)
  const estimateNote = buildEstimateContextNote(config.stateName, hasAdj)
  const methodology = buildReliefMethodologySummary(config.stateName, 'town')

  return (
    <section
      className="rounded-xl border border-border bg-surface/90 p-4 md:p-5"
      aria-labelledby="town-relief-heading"
    >
      <h3 id="town-relief-heading" className="text-lg font-semibold text-text">
        Property tax exemptions in {config.stateName} affecting {townDisplayName}
      </h3>
      <p className="mt-2 text-xs text-text-muted leading-relaxed">{intro}</p>
      <p className="mt-2 text-xs font-medium text-text">{estimateNote}</p>

      <ul className="mt-4 space-y-2">
        {highlights.map(p => (
          <HighlightRow key={p.id} program={p} />
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-text-muted">{methodology}</p>

      <p className="mt-4">
        <Link
          href={`/${encState}/${encCounty}#county-relief-heading`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View full {countyDisplayName} County exemption details →
        </Link>
      </p>
    </section>
  )
}
