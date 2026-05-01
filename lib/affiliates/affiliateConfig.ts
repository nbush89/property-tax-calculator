/**
 * Affiliate and referral link configuration.
 *
 * Replace placeholder URLs with your actual referral/affiliate links once
 * you've been approved by each program. Set `enabled: false` to suppress a
 * CTA without removing the config entry.
 *
 * Appeal links: Ownwell, Enroll, etc. — pay per enrolled customer.
 * Mortgage links: Rocket Mortgage (via Impact), LendingTree, Bankrate.
 */

export type AffiliateCta = {
  enabled: boolean
  /** Display label on the button */
  label: string
  /** Full affiliate/referral URL including your tracking parameters */
  url: string
  /** One-line description shown under the button */
  description: string
  /** Opens in new tab — always true for external affiliate links */
  external: boolean
}

export type StateAffiliateConfig = {
  /** Property tax appeal referral — high intent match for users seeing a large bill */
  appealCta: AffiliateCta
  /** Mortgage rate comparison — relevant for users in the home-buying funnel */
  mortgageCta: AffiliateCta
}

const DISABLED_CTA: AffiliateCta = {
  enabled: false,
  label: '',
  url: '',
  description: '',
  external: true,
}

/**
 * Per-state config. States without an entry fall back to DEFAULT_CONFIG.
 * Set enabled: true and fill in your affiliate URL once approved.
 */
const STATE_AFFILIATE_CONFIGS: Record<string, StateAffiliateConfig> = {
  'new-jersey': {
    appealCta: {
      enabled: false, // set true once you have your Ownwell referral link
      label: 'Get a free property tax review',
      url: 'https://ownwell.com/?utm_source=njpropertytax&utm_medium=referral', // replace with your referral URL
      description: 'Think your assessment is too high? Ownwell reviews your bill for free — you only pay if they save you money.',
      external: true,
    },
    mortgageCta: {
      enabled: false, // set true once approved by LendingTree / Rocket Mortgage
      label: 'Compare mortgage rates in New Jersey',
      url: 'https://www.lendingtree.com/home/mortgage/?utm_source=njpropertytax', // replace with affiliate URL
      description: 'See current mortgage rates from multiple lenders. No obligation.',
      external: true,
    },
  },
  texas: {
    appealCta: {
      enabled: false,
      label: 'Get a free property tax review',
      url: 'https://ownwell.com/?utm_source=txpropertytax&utm_medium=referral', // replace with your referral URL
      description: 'Think your appraisal is too high? Ownwell protests on your behalf — free to start, you pay only if they save you money.',
      external: true,
    },
    mortgageCta: {
      enabled: false,
      label: 'Compare mortgage rates in Texas',
      url: 'https://www.lendingtree.com/home/mortgage/?utm_source=txpropertytax', // replace with affiliate URL
      description: 'See current mortgage rates from multiple lenders. No obligation.',
      external: true,
    },
  },
}

const DEFAULT_CONFIG: StateAffiliateConfig = {
  appealCta: DISABLED_CTA,
  mortgageCta: DISABLED_CTA,
}

export function getStateAffiliateConfig(stateSlug: string): StateAffiliateConfig {
  return STATE_AFFILIATE_CONFIGS[stateSlug] ?? DEFAULT_CONFIG
}
