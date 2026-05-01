/**
 * Central registry: per-state metric availability by geography + calculator flags.
 * Add new states here; UI resolves display from this + data payloads.
 */

import type { StateMetricsConfig } from './capabilityTypes'
import type { GeographyLevel, MetricAvailability } from './capabilityTypes'
import type { MetricKey } from './metricKeys'

/**
 * County effective rate: ACS-derived blended rate (B25103 median taxes / B25077 median home value).
 * Covers all overlapping taxing units — county + city + school district + special districts.
 */
const TX_RATE_NOTE_COUNTY =
  'Derived from U.S. Census ACS 5-year estimates: median real estate taxes paid (B25103) divided by median home value (B25077). Reflects the combined effective rate across all overlapping taxing units — county government, school district, city, and special districts — net of homestead exemptions already reflected in survey responses.'

const TX_RATE_NOTE_TOWN =
  'Reflects the published total tax rate for the city taxing unit (Texas Comptroller Tax Rates and Levies). Covers only the city taxing unit — not the school district or other overlapping jurisdictions.'

/** Primary workbook / program reference for Texas town-level rates (Comptroller) */
const TX_SOURCE_KEY = 'tx_comptroller_tax_rates_levies'

/** ACS-derived blended effective rate source ref for Texas county level */
const TX_COUNTY_ACS_SOURCE_KEY = 'us_census_acs_county_effective_rate'

export const STATE_METRICS_REGISTRY: Record<string, StateMetricsConfig> = {
  'new-jersey': {
    calculator: {
      hasCountyAndMunicipalRates: true,
      hasComptrollerUnitRates: false,
      hasTownPages: true,
    },
    metrics: {
      state: {
        averageTaxRate: {
          supported: true,
          semantics: 'standard',
          comparability: 'medium',
          sourceRef: 'nj_div_taxation_general_effective_tax_rates',
          note: 'Statewide average where published in NJ sources.',
        },
      },
      county: {
        effectiveTaxRate: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'nj_div_taxation_general_effective_tax_rates',
        },
        averageResidentialTaxBill: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'nj_modiv_avg_restax',
          note: 'County average residential tax bill (MOD IV / Division of Taxation).',
        },
        medianHomeValue: {
          supported: false,
        },
      },
      town: {
        effectiveTaxRate: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'nj_div_taxation_general_effective_tax_rates',
        },
        averageResidentialTaxBill: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'nj_modiv_avg_restax',
        },
        medianHomeValue: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'us_census_acs_profile_dp04',
          note: 'Median owner-occupied home value (ACS), where merged for this municipality.',
        },
      },
    },
  },

  texas: {
    calculator: {
      hasCountyAndMunicipalRates: false,
      hasComptrollerUnitRates: true,
      hasTownPages: true,
    },
    metrics: {
      state: {},
      county: {
        effectiveTaxRate: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: TX_COUNTY_ACS_SOURCE_KEY,
          note: TX_RATE_NOTE_COUNTY,
        },
        averageResidentialTaxBill: {
          supported: false,
        },
        medianTaxesPaid: {
          supported: true,
          semantics: 'state_specific',
          comparability: 'medium',
          sourceRef: 'us_census_acs_profile_dp04',
          note:
            'ACS median real estate taxes paid (B25103_001E): combined annual property tax across overlapping taxing units.',
        },
        medianHomeValue: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'us_census_acs_profile_dp04',
          note: 'Shown when county-level ACS median is present in the dataset.',
        },
      },
      town: {
        effectiveTaxRate: {
          supported: true,
          semantics: 'state_specific',
          comparability: 'low',
          sourceRef: TX_SOURCE_KEY,
          note: TX_RATE_NOTE_TOWN,
        },
        averageResidentialTaxBill: {
          supported: false,
        },
        medianTaxesPaid: {
          supported: true,
          semantics: 'state_specific',
          comparability: 'medium',
          sourceRef: 'us_census_acs_profile_dp04',
          note:
            'ACS median real estate taxes paid (B25103_001E): combined annual property tax across overlapping taxing units.',
        },
        medianHomeValue: {
          supported: true,
          semantics: 'standard',
          comparability: 'high',
          sourceRef: 'us_census_acs_profile_dp04',
        },
      },
    },
  },
}

export function getStateMetricsConfig(stateSlug: string): StateMetricsConfig | null {
  const key = stateSlug?.toLowerCase?.() ?? ''
  return STATE_METRICS_REGISTRY[key] ?? null
}

export function getStateMetricCapabilities(stateSlug: string) {
  return getStateMetricsConfig(stateSlug)?.metrics ?? null
}

export function getMetricAvailability(
  stateSlug: string,
  geographyLevel: GeographyLevel,
  metricKey: MetricKey
): MetricAvailability | null {
  const caps = getStateMetricCapabilities(stateSlug)
  const geo = caps?.[geographyLevel]
  if (!geo) return null
  const row = geo[metricKey]
  if (!row) return { supported: false }
  return row
}

/**
 * Whether average residential tax bill is a supported concept anywhere in this state (for calculator gating legacy field).
 */
export function stateSupportsAverageTaxBill(stateSlug: string): boolean {
  const caps = getStateMetricCapabilities(stateSlug)
  if (!caps) return false
  const county = caps.county?.averageResidentialTaxBill
  const town = caps.town?.averageResidentialTaxBill
  return county?.supported === true || town?.supported === true
}

/**
 * True if the metric may be shown for this geography.
 * When no capability row exists (new state not yet registered), defaults permissive (true).
 * Explicit `{ supported: false }` blocks display.
 */
export function isMetricDisplayAllowed(
  stateSlug: string,
  geographyLevel: GeographyLevel,
  metricKey: MetricKey
): boolean {
  const row = getMetricAvailability(stateSlug, geographyLevel, metricKey)
  if (row == null) return true
  return row.supported === true
}
