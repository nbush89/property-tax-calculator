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
  /**
   * Property tax EXEMPTIONS referral — homestead, senior, veteran, disability.
   * Year-round relevance (unlike appeals, which has tight seasonal windows).
   * Optional — states without an exemptions program can omit.
   */
  exemptionsCta?: AffiliateCta
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
      enabled: true,
      // CJ tracking link (publisher 101739122, ad 15710172 → ownwell.com/) is
      // reused from the GA config because CJ ad IDs are landing-page-specific,
      // not state-locked. Publisher attribution still routes to this account.
      // Per-page differentiation (e.g. ?sid=texas-harris-houston) is appended
      // via appendSid() so we still get clean per-URL conversion reporting in
      // CJ. If Sal needs cleaner TX/GA campaign separation on his side later,
      // swap to a TX-specific ad ID when he provides one.
      label: 'Get a free property tax review',
      url: 'https://www.tkqlhce.com/click-101739122-15710172',
      description:
        'Ownwell reviews your appraisal for free — you only pay if they save you money. Ownwell reports an 88% success rate and $774 average annual savings for customers who appeal (4.7★ Google, 3,000+ reviews). Texas protests must be filed within 30 days of your appraisal notice or by May 15, whichever is later.',
      external: true,
    },
    exemptionsCta: {
      enabled: true,
      // Same reasoning as appealCta — reusing GA exemptions ad (15707047 →
      // ownwell.com/exemptions) since it's landing-page-specific, not
      // state-locked. SID appended via appendSid() distinguishes TX traffic.
      label: 'File or check your Texas exemptions',
      url: 'https://www.tkqlhce.com/click-101739122-15707047',
      description:
        'Ownwell files Texas general residence homestead and senior (65+) exemptions on your behalf — and can recover up to 2 years of overpaid taxes through retroactive filing (the Texas state limit). Many homeowners who forgot to file when they bought are owed a refund.',
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
  georgia: {
    appealCta: {
      enabled: true,
      label: 'Get a free property tax review',
      // CJ tracking link for Ownwell (advertiser 6784655, ad 15710172 → ownwell.com/).
      // SID is appended per call via `appendSid()` so we can see in CJ
      // reports which pages convert (e.g. ?sid=georgia-fulton-county).
      url: 'https://www.tkqlhce.com/click-101739122-15710172',
      // Social-proof stats are attributed to Ownwell ("Ownwell reports") to
      // make clear they are partner-reported, not independently audited by us.
      description:
        'Ownwell reviews your bill for free — you only pay if they save you money. Ownwell reports an 88% success rate and $774 average annual savings for customers who appeal (4.7★ Google, 3,000+ reviews). Georgia appeals must be filed within 45 days of your annual notice.',
      external: true,
    },
    exemptionsCta: {
      enabled: true,
      label: 'See which exemptions you qualify for',
      // CJ tracking link for Ownwell exemptions text link (ad 15707047 →
      // ownwell.com/exemptions). Year-round relevance.
      url: 'https://www.tkqlhce.com/click-101739122-15707047',
      description:
        'Many Georgia counties stack senior, veteran, disability, and floating homestead exemptions on top of the statewide $2,000 standard. Ownwell can check what you qualify for — they report 500,000+ homeowners served and a 4.7★ Google rating.',
      external: true,
    },
    mortgageCta: {
      enabled: false,
      label: 'Compare mortgage rates in Georgia',
      url: 'https://www.lendingtree.com/home/mortgage/?utm_source=gapropertytax',
      description: 'See current mortgage rates from multiple lenders. No obligation.',
      external: true,
    },
  },
}

/**
 * Append a per-page SID to a CJ tracking URL for sub-tracking in reports.
 * CJ stores anything after `?sid=` (or `&sid=`) and surfaces it in the
 * advertiser dashboard alongside conversions.
 *
 * Use a deterministic SID format so the data stays comparable:
 *   {state}-{page-type}[-{slug}]
 * e.g.: georgia-appeal-calc, georgia-county-fulton, georgia-town-atlanta.
 */
export function appendSid(url: string, sid: string): string {
  if (!sid) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}sid=${encodeURIComponent(sid)}`
}

const DEFAULT_CONFIG: StateAffiliateConfig = {
  appealCta: DISABLED_CTA,
  mortgageCta: DISABLED_CTA,
}

export function getStateAffiliateConfig(stateSlug: string): StateAffiliateConfig {
  return STATE_AFFILIATE_CONFIGS[stateSlug] ?? DEFAULT_CONFIG
}
