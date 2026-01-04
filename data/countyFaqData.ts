/**
 * FAQ data for county-level property tax pages
 */
import type { FAQItem } from './faqData'

export function getCountyFaqData(countyName: string): FAQItem[] {
  return [
    {
      question: `How are property taxes calculated in ${countyName} County?`,
      answer: `Property taxes in ${countyName} County are calculated based on your property's assessed value multiplied by the county's effective tax rate. The rate includes county, municipal, school district, and other local tax components. Our calculator uses current ${countyName} County tax rates to provide accurate estimates.`
    },
    {
      question: `What is the average property tax rate in ${countyName} County?`,
      answer: `${countyName} County's effective tax rate varies by municipality. The calculator uses the most current rates available. For the most accurate assessment, enter your specific municipality in the calculator above.`
    },
    {
      question: `Can I appeal my property tax assessment in ${countyName} County?`,
      answer: `Yes, property owners in ${countyName} County can appeal their tax assessment. Contact the ${countyName} County Tax Assessor's office for information about the appeals process, deadlines, and required documentation.`
    },
    {
      question: `What exemptions are available in ${countyName} County?`,
      answer: `New Jersey offers several property tax exemptions including Senior Citizen Freeze, Veteran exemptions, and Disabled Person exemptions. These apply statewide, including in ${countyName} County. Use the calculator above to see how exemptions affect your tax amount.`
    },
    {
      question: `How often are property taxes reassessed in ${countyName} County?`,
      answer: `Reassessment schedules vary by municipality within ${countyName} County. Some municipalities reassess annually, while others may do so every few years. Contact your local tax assessor's office for specific information about your municipality's reassessment schedule.`
    }
  ]
}

