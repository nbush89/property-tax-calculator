/**
 * County-level FAQ — generated in code (state-aware), not from county prose JSON.
 */
import type { FAQItem } from './faqData'
import { getStateCapabilities } from '@/lib/state-capabilities'

export function getCountyFaqData(countyName: string, stateSlug: string): FAQItem[] {
  const cap = getStateCapabilities(stateSlug)
  const tx = cap.hasComptrollerUnitRates

  const appealsWhere = tx
    ? `Contact your county central appraisal district for appeal windows, evidence requirements, and protest procedures.`
    : `Contact your municipal tax assessor or county tax board for appeal deadlines, comparables, and required forms.`

  const exemptionsAnswer = tx
    ? `Texas offers several exemptions (for example, homestead for qualifying owners) that can reduce taxable value. Eligibility and application deadlines vary; confirm with your county appraisal district and the Texas Comptroller’s published guidance.`
    : `New Jersey offers exemptions and programs (such as senior freeze, veteran, and disability programs) that can affect liabilities. Eligibility is statewide but administration is local—verify with your municipal tax office.`

  const calculationAnswer = tx
    ? `Property taxes generally tie to appraised taxable value and the rates for the taxing units that apply to your address. In Texas, published rates are often shown per taxing unit (county, city, school district, etc.); our calculator uses the data and methodology described on this site—verify with your appraisal district for an official bill.`
    : `Municipalities in ${countyName} County use locally published rates that roll up county, municipal, school, and other components. Our calculator applies the latest rates in our dataset for your selected place—use it for planning, then confirm with your local assessor.`

  const rateAnswer = tx
    ? `Effective or total tax rates differ by address because different combinations of taxing units apply. Pick your city when available in the calculator to align with the published city or county unit rate we use for that place.`
    : `Effective tax rates vary by municipality in ${countyName} County. Choose your municipality in the calculator for the closest match to published local data.`

  const reassessmentAnswer = tx
    ? `Appraisal districts reappraise on schedules governed by state law; notices and protest deadlines are published on typical annual cycles. Check with your county appraisal district for the timeline that applies to your property.`
    : `Reassessment and revaluation schedules vary by municipality in ${countyName} County. Some communities reassess annually, others on longer cycles—confirm dates with your local tax assessor.`

  return [
    {
      question: `How are property taxes calculated in ${countyName} County?`,
      answer: calculationAnswer,
    },
    {
      question: `What is the typical property tax rate in ${countyName} County?`,
      answer: rateAnswer,
    },
    {
      question: `Can I appeal my property tax appraisal or assessment in ${countyName} County?`,
      answer: `Yes, owners can typically challenge appraisals or assessments within published filing windows. ${appealsWhere}`,
    },
    {
      question: `What exemptions might apply in ${countyName} County?`,
      answer: exemptionsAnswer,
    },
    {
      question: `How often are properties reappraised or reassessed in ${countyName} County?`,
      answer: reassessmentAnswer,
    },
  ]
}
