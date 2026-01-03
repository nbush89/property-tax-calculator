/**
 * FAQ data - shared between client and server components
 * Used for both the FAQ page display and JSON-LD structured data
 */
export type FAQItem = {
  question: string
  answer: string
}

export const faqData: FAQItem[] = [
  {
    question: 'Is this an official government tool?',
    answer:
      'No, this is an independent calculator that provides estimates based on publicly available tax rate data. For official tax information, please consult your county tax assessor\'s office.',
  },
  {
    question: 'How accurate is the estimate?',
    answer:
      'Our estimates are based on current county and municipal tax rates. While we strive for accuracy, actual property taxes may vary based on local assessment practices, recent rate changes, and property-specific factors. Always verify with your local tax assessor for official amounts.',
  },
  {
    question: 'Do you store my address or personal info?',
    answer:
      'No, we do not collect, store, or transmit any personal information. All calculations are performed locally in your browser. We don\'t require sign-ups, accounts, or any personal data.',
  },
  {
    question: 'Does this include school taxes?',
    answer:
      'Yes, our calculations include all property tax components including county, municipal, school, and other local taxes. The breakdown shows how your total tax is distributed across these categories.',
  },
  {
    question: 'What exemptions are supported?',
    answer:
      'We support several common New Jersey exemptions including Senior Citizen Freeze ($250), Veteran ($6,000), and Disabled Person ($3,500). Select applicable exemptions in the calculator to see how they affect your tax amount.',
  },
  {
    question: 'Can I use this for any NJ county?',
    answer:
      'Yes! Our calculator supports all 21 counties in New Jersey. Simply select your county from the dropdown, and optionally choose your municipality for more precise calculations.',
  },
]

