/**
 * State hub page FAQs — shared by app route and publish-readiness validator.
 */
import type { FAQItem } from './faqData'

export function getStatePageFaqData(stateSlug: string): FAQItem[] {
  const njSourceAnswer =
    'We use publicly available data from the NJ Division of Taxation (MOD IV Average Residential Tax Report, General & Effective Tax Rates) and the U.S. Census Bureau (ACS 5-year estimates for median home values). All sources are clearly labeled on each page.'

  const base: FAQItem[] = [
    {
      question: 'Are these official tax bills?',
      answer:
        'No, these are planning estimates based on publicly available data. Actual tax bills depend on individual property assessments, exemptions, and local tax decisions. Always verify with your local tax assessor for official amounts.',
    },
    {
      question: 'Why do towns differ from county averages?',
      answer:
        'Property taxes vary by municipality due to differences in local budgets, school district funding, assessment practices, and municipal services. County averages provide context, but individual towns may have significantly different rates.',
    },
    {
      question: 'What data sources are used?',
      answer:
        stateSlug === 'new-jersey'
          ? njSourceAnswer
          : `We use publicly available data from state and federal sources. All sources are clearly labeled on each page.`,
    },
    {
      question: 'What year is the data?',
      answer:
        'Data is explicitly labeled by year on each page. Different datasets update on different schedules. We always show the most recent available data and clearly label the year.',
    },
  ]

  if (stateSlug === 'new-jersey') {
    base.push({
      question: 'Does this include exemptions?',
      answer:
        'The calculator supports some exemption scenarios (senior freeze, veteran, disabled person), but individual eligibility and amounts vary. Always verify exemption details with your local tax assessor, as exemptions can significantly reduce your actual tax bill.',
    })
  }

  return base
}
