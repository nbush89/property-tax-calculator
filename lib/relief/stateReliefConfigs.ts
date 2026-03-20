/**
 * Registry and resolvers for state relief configuration.
 */

import type { ReliefProgram, StateReliefConfig, SelectedReliefInputs } from './types'
import { texasReliefConfig } from './states/texasRelief'
import { newJerseyReliefConfig } from './states/newJerseyRelief'

const registry: Record<string, StateReliefConfig> = {
  texas: texasReliefConfig,
  'new-jersey': newJerseyReliefConfig,
}

export function getStateReliefConfig(stateSlug: string): StateReliefConfig | null {
  return registry[stateSlug.toLowerCase()] ?? null
}

export function getCalculatorAdjustablePrograms(stateSlug: string): ReliefProgram[] {
  return (
    getStateReliefConfig(stateSlug)?.programs.filter(p => p.modelingMode === 'calculator_adjustable') ?? []
  )
}

export function getInformationalPrograms(stateSlug: string): ReliefProgram[] {
  return (
    getStateReliefConfig(stateSlug)?.programs.filter(p => p.modelingMode === 'informational_only') ?? []
  )
}

export function hasCalculatorAdjustableRelief(stateSlug: string): boolean {
  return getCalculatorAdjustablePrograms(stateSlug).length > 0
}

export function hasInformationalReliefPrograms(stateSlug: string): boolean {
  return getInformationalPrograms(stateSlug).length > 0
}

/** Normalize client payload: only truthy program selections */
export function normalizeReliefSelections(
  raw: unknown
): SelectedReliefInputs | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: SelectedReliefInputs = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === true) out[k] = true
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'string' && v.length > 0) out[k] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}
