/**
 * State-specific property tax appeal guidance.
 * Add a new entry here when expanding to a new state — everything else is data-driven.
 */

export interface AppealContent {
  /** 2–3 sentence overview of the appeal process for this state. */
  processOverview: string
  /** Name of the body that hears assessment appeals. */
  appealBoard: string
  /** Deadline guidance — kept intentionally general to stay accurate year over year. */
  deadlineGuidance: string
  /** Key documents typically required. */
  requiredDocs: string[]
  /** State-specific tips for strengthening an appeal. */
  tips: string[]
  /** Official state resource URL. */
  officialUrl: string
  /** Display label for the official URL. */
  officialUrlLabel: string
}

const STATE_APPEAL_CONTENT: Record<string, AppealContent> = {
  'new-jersey': {
    processOverview:
      'In New Jersey, property owners can appeal their assessment to the county board of taxation by filing Form A-1. If the county decision is unsatisfactory, further appeal to the New Jersey Tax Court is available. The appeal process is separate from applying for exemptions or abatements.',
    appealBoard: 'County Board of Taxation',
    deadlineGuidance:
      'The annual filing deadline is typically April 1 of the tax year, or 45 days from the date the assessment notice was mailed — whichever is later. Deadlines shift in revaluation years; confirm the current deadline with your county board.',
    requiredDocs: [
      'Completed Form A-1 (Petition of Appeal)',
      'Recent comparable sales (comps) supporting your estimated market value',
      'Independent appraisal (strongly recommended for appeals over $150K difference)',
      'Photos of the property showing condition or defects',
    ],
    tips: [
      'Pull recent sales of comparable homes in your neighborhood from Zillow or the county assessor site — comps are the strongest evidence.',
      'Your assessed value should reflect market value as of October 1 of the pre-tax year, not the current date.',
      'Even a small rate reduction compounds over years — a $5,000 assessment cut saves roughly the effective rate × $5,000 every year.',
      'Third-party services like Ownwell handle the filing and comps research on your behalf, typically for a percentage of the first-year savings.',
    ],
    officialUrl: 'https://www.nj.gov/treasury/taxation/lpt/lptappeal.shtml',
    officialUrlLabel: 'NJ Division of Taxation — Property Tax Appeals',
  },

  texas: {
    processOverview:
      "In Texas, property owners protest their appraisal district's value by filing a Notice of Protest with the county Appraisal Review Board (ARB). Most protests are resolved at an informal hearing with an appraisal district representative; unresolved cases proceed to a formal ARB hearing.",
    appealBoard: 'Appraisal Review Board (ARB)',
    deadlineGuidance:
      'The deadline to file a Notice of Protest is May 15, or 30 days from the date the appraisal notice was mailed — whichever is later. File early to allow time to gather comparables before your hearing.',
    requiredDocs: [
      'Completed Notice of Protest form (available from your county appraisal district)',
      'Recent sales of comparable properties in the same neighborhood',
      'Independent appraisal or broker price opinion',
      'Documentation of any condition issues affecting market value (repair estimates, inspection reports)',
    ],
    tips: [
      'Texas uses January 1 market value — use sales from the prior calendar year as your comparables.',
      "Request a copy of the appraisal district's evidence package before your hearing so you know what comps they used.",
      'Informal hearings settle most protests; come prepared with 3–5 strong comps and a clear ask.',
      'Services like Ownwell file and argue the protest on your behalf, charging only if they win savings.',
    ],
    officialUrl:
      'https://comptroller.texas.gov/taxes/property-tax/taxpayers/appeals.php',
    officialUrlLabel: 'Texas Comptroller — Property Tax Protests and Appeals',
  },

  georgia: {
    processOverview:
      "In Georgia, property owners appeal their assessment by filing a Form PT-311A with the county Board of Tax Assessors within 45 days of the date on their annual assessment notice. The Board of Tax Assessors reviews the appeal first; if the result is unsatisfactory, the case proceeds to the county Board of Equalization (BOE), a Hearing Officer (for non-homestead property over $750,000), or binding arbitration — taxpayer's choice.",
    appealBoard: 'County Board of Tax Assessors → Board of Equalization',
    deadlineGuidance:
      "Georgia gives you 45 days from the date printed on your annual assessment notice to file Form PT-311A with the county Board of Tax Assessors. Annual notices typically mail between April and June — exact timing varies by county. If you miss the 45-day window, you generally cannot appeal that year's assessment. Mark the postmark date as soon as the notice arrives and file electronically through your county's tax assessor portal when available; mail can eat several days you may not have to spare.",
    requiredDocs: [
      'Completed Form PT-311A (Appeal of Assessment), signed and dated within the 45-day window',
      'Recent comparable sales (within the last 12 months) from your neighborhood at similar square footage and condition',
      'Independent fee appraisal — strongly recommended for appeals over $25,000 in assessed-value difference (or $62,500 in fair market value, since GA assesses at 40%)',
      'Photos and documentation of any property condition issues, deferred maintenance, or functional obsolescence',
    ],
    tips: [
      "Georgia assesses property at 40% of fair market value. Your assessment notice shows assessed value — multiply by 2.5 to compare against recent comparable sale prices in your neighborhood (a $200,000 assessed value implies $500,000 fair market value).",
      'Comparable sales from the same county within the last 12 months carry the most weight. Pull 3–5 strong comps, ideally on the same street or in the same subdivision, similar in square footage (±15%) and condition.',
      "If a Board of Tax Assessors review doesn't go your way, you have the right to escalate to the Board of Equalization (BOE) — a citizen panel that often rules more favorably than the original assessors. The BOE hearing is free; bring the same comps plus any new evidence.",
      'For homes valued over $750,000 or non-homestead property, you can bypass the BOE and request a Hearing Officer (an experienced appraiser) — usually faster but with a $25 filing fee.',
      'Third-party services like Ownwell file the appeal and argue it on your behalf, charging only a percentage of the first-year savings if successful.',
    ],
    officialUrl:
      'https://dor.georgia.gov/property-tax-appeals',
    officialUrlLabel: 'Georgia Department of Revenue — Property Tax Appeals',
  },
}

const DEFAULT_APPEAL_CONTENT: AppealContent = {
  processOverview:
    "Property owners can typically appeal their assessment to a local or state review board if they believe their property is assessed above market value. The process varies by state — contact your local assessor's office for the specific procedure in your area.",
  appealBoard: 'Local Board of Assessment Review',
  deadlineGuidance:
    "Deadlines vary by state and county. Contact your local assessor's office to confirm the current filing deadline.",
  requiredDocs: [
    'Completed appeal petition form',
    'Recent comparable sales supporting your estimated market value',
    'Independent appraisal where available',
  ],
  tips: [
    'Comparable recent sales in your neighborhood are the strongest evidence in most jurisdictions.',
    'File as early as possible to allow time to gather documentation.',
  ],
  officialUrl: 'https://www.iaao.org',
  officialUrlLabel: 'International Association of Assessing Officers',
}

export function getAppealContent(stateSlug: string): AppealContent {
  return STATE_APPEAL_CONTENT[stateSlug.toLowerCase()] ?? DEFAULT_APPEAL_CONTENT
}
