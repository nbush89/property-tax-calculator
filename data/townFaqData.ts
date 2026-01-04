/**
 * FAQ data for town-level property tax pages
 */
import type { FAQItem } from './faqData'

export function getTownFaqData(townName: string, countyName: string): FAQItem[] {
  return [
    {
      question: `What is the property tax rate in ${townName}, ${countyName} County?`,
      answer: `The property tax rate in ${townName} varies based on the property's assessed value and includes county, municipal, and school district components. Use the calculator above with your property value to get an accurate estimate for ${townName}.`
    },
    {
      question: `How do ${townName} property taxes compare to other ${countyName} County municipalities?`,
      answer: `Property tax rates can vary significantly between municipalities within ${countyName} County. ${townName}'s rate reflects local budget needs, school funding, and municipal services. The calculator above helps you understand how ${townName} compares to the county average.`
    },
    {
      question: `Who do I contact about property taxes in ${townName}?`,
      answer: `For questions about property taxes in ${townName}, contact the ${townName} Municipal Tax Assessor's office or the ${countyName} County Tax Administrator. They can provide information about assessments, exemptions, payment schedules, and appeals.`
    },
    {
      question: `Are there any local exemptions or programs in ${townName}?`,
      answer: `In addition to state-wide exemptions (Senior Citizen Freeze, Veteran, Disabled Person), some municipalities in ${countyName} County may offer additional local programs. Contact the ${townName} tax assessor's office to learn about all available exemptions and programs.`
    },
    {
      question: `When are property tax payments due in ${townName}?`,
      answer: `Property tax payment schedules vary by municipality in ${countyName} County. ${townName} typically follows quarterly payment schedules, but exact due dates may vary. Contact the ${townName} tax collector's office for the current year's payment schedule.`
    }
  ]
}

