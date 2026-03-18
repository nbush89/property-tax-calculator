import { buildRecentYears } from '../../utils/buildRecentYears'

/** Source ref for Texas official property tax rate data (Comptroller / CAD) when merged. */
export const TX_RATES_SOURCE_REF = 'tx_comptroller_property_tax_rates'

const CURRENT_YEAR = new Date().getFullYear()

/** Years window for Texas rate sourcing (aligned with NJ GTR window until TX source is wired). */
export const TX_RATE_YEARS = buildRecentYears({
  endYear: CURRENT_YEAR - 1,
  window: 6,
})
