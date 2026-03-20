/**
 * Compact program list for town pages: calculator-adjustable first, then informational, cap N.
 */

import type { ReliefProgram } from './types'
import { getStateReliefConfig } from './stateReliefConfigs'

const DEFAULT_MAX = 3

export function getTownReliefHighlights(
  stateSlug: string,
  maxPrograms: number = DEFAULT_MAX
): ReliefProgram[] {
  const config = getStateReliefConfig(stateSlug)
  if (!config?.programs.length || maxPrograms < 1) return []

  const adjustable = config.programs.filter(p => p.modelingMode === 'calculator_adjustable')
  const informational = config.programs.filter(p => p.modelingMode === 'informational_only')

  const out: ReliefProgram[] = []
  for (const p of adjustable) {
    if (out.length >= maxPrograms) break
    out.push(p)
  }
  for (const p of informational) {
    if (out.length >= maxPrograms) break
    out.push(p)
  }
  return out
}