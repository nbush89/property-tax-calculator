/**
 * Town-level FAQ — capability-aware, not NJ-specific.
 */
import type { FAQItem } from './faqData'
import { getStateCapabilities } from '@/lib/state-capabilities'

export type TownFaqContext = {
  /** Town-level average residential tax bill present in dataset */
  hasTownAvgBillMetric: boolean
  /** Town-level effective rate present */
  hasTownRateMetric: boolean
  /** Snapshot uses county values as stand-in for missing town figures */
  usesCountyFallback: boolean
}

export function getTownFaqData(
  townName: string,
  countyName: string,
  stateSlug: string,
  ctx?: TownFaqContext
): FAQItem[] {
  const cap = getStateCapabilities(stateSlug)
  const appeals =
    cap.hasComptrollerUnitRates
      ? `Contact your county appraisal district or tax office for protests, evidence, and deadlines.`
      : `Contact your municipal tax assessor or ${countyName} County tax administration for appeals and deadlines.`

  const exemptions =
    cap.hasComptrollerUnitRates
      ? `Texas offers exemptions (such as homestead for qualifying owners) that can lower taxable value. Confirm eligibility and filings with your county appraisal district.`
      : `New Jersey offers statewide programs (e.g. senior freeze, veterans, disability) that may apply in ${countyName} County. Ask your local tax office what you qualify for.`

  const rateAnswer = cap.hasComptrollerUnitRates
    ? `Rates depend on the taxing units that apply to your address (county, city, school districts, etc.). Our calculator uses published rates for ${townName} where available in our dataset—pick this municipality so the estimate matches that published unit rate.`
    : `The local rate combines county, municipal, school, and other components. Use the calculator with ${townName} selected for the closest match to published data.`

  const compareAnswer =
    ctx?.usesCountyFallback && !ctx?.hasTownAvgBillMetric
      ? `Published comparisons between ${townName} and other places depend on town-level data in our dataset. Where we only have county-level averages, use the county page and calculator to compare, or run estimates for neighboring towns that have town-level rates.`
      : `Rates and average bills vary across ${countyName} County. The calculator above helps you stress-test ${townName} against other municipalities when we have their rates in the dataset.`

  const billMention =
    ctx?.hasTownAvgBillMetric && cap.hasAverageTaxBill
      ? ` Average residential tax bill figures are included where published for this municipality.`
      : !cap.hasAverageTaxBill
        ? ` This state’s public data in our tool emphasizes effective rates rather than average tax bills at town level.`
        : ''

  return [
    {
      question: `What is the property tax rate in ${townName}, ${countyName} County?`,
      answer: `${rateAnswer}${billMention}`,
    },
    {
      question: `How do ${townName} property taxes compare to other ${countyName} County municipalities?`,
      answer: compareAnswer,
    },
    {
      question: `Who do I contact about property taxes in ${townName}?`,
      answer: `For assessments, exemptions, and billing questions, ${appeals} The municipality may also have a local tax or collection office.`,
    },
    {
      question: `Are there exemptions or relief programs that might apply?`,
      answer: exemptions,
    },
    {
      question: `When are property tax payments due in ${townName}?`,
      answer: `Due dates and installment schedules are set locally or by the county. Contact your tax collector or appraisal district for the current-year schedule in ${townName}.`,
    },
  ]
}
