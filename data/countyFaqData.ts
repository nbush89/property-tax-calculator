/**
 * County-level FAQ — generated in code (state-aware), not from county prose JSON.
 */
import type { FAQItem } from './faqData'
import { getStateCapabilities } from '@/lib/state-capabilities'
import { getHb581Status } from '@/components/county/Hb581ExplainerSection'

export function getCountyFaqData(countyName: string, stateSlug: string): FAQItem[] {
  const cap = getStateCapabilities(stateSlug)
  const tx = cap.hasComptrollerUnitRates
  const ga = cap.hasAssessedValueMillage

  const appealsWhere = tx
    ? `Contact your county central appraisal district for appeal windows, evidence requirements, and protest procedures.`
    : ga
      ? `Contact the ${countyName} County Board of Tax Assessors. Georgia appeals must typically be filed within 45 days of the annual assessment notice.`
      : `Contact your municipal tax assessor or county tax board for appeal deadlines, comparables, and required forms.`

  const exemptionsAnswer = tx
    ? `Texas offers several exemptions (for example, homestead for qualifying owners) that can reduce taxable value. Eligibility and application deadlines vary; confirm with your county appraisal district and the Texas Comptroller’s published guidance.`
    : ga
      ? `Georgia offers a statewide $2,000 standard homestead exemption for primary residences (applied to assessed value, not market value). Many counties stack additional local exemptions — senior age-65, disability, veteran, and floating homesteads. Confirm what applies with the ${countyName} County Tax Commissioner.`
      : `New Jersey offers exemptions and programs (such as senior freeze, veteran, and disability programs) that can affect liabilities. Eligibility is statewide but administration is local—verify with your municipal tax office.`

  const calculationAnswer = tx
    ? `Property taxes generally tie to appraised taxable value and the rates for the taxing units that apply to your address. In Texas, published rates are often shown per taxing unit (county, city, school district, etc.); our calculator uses the data and methodology described on this site—verify with your appraisal district for an official bill.`
    : ga
      ? `Georgia property tax is calculated as (40% of fair market value − homestead exemptions) × total millage rate. The 40% assessment ratio is set by the state constitution. Total millage is the sum of county, city, school district, and state mills published annually by the Georgia Department of Revenue.`
      : `Municipalities in ${countyName} County use locally published rates that roll up county, municipal, school, and other components. Our calculator applies the latest rates in our dataset for your selected place—use it for planning, then confirm with your local assessor.`

  const rateAnswer = tx
    ? `Effective or total tax rates differ by address because different combinations of taxing units apply. Pick your city when available in the calculator to align with the published city or county unit rate we use for that place.`
    : ga
      ? `Millage rates vary by city within ${countyName} County because each city sets its own M&O and bond millage on top of county, school, and state mills. Pick your city in the calculator for the most precise total millage.`
      : `Effective tax rates vary by municipality in ${countyName} County. Choose your municipality in the calculator for the closest match to published local data.`

  const reassessmentAnswer = tx
    ? `Appraisal districts reappraise on schedules governed by state law; notices and protest deadlines are published on typical annual cycles. Check with your county appraisal district for the timeline that applies to your property.`
    : ga
      ? `Georgia counties reappraise on annual cycles. ${countyName} County mails annual assessment notices in the spring; appeals must be filed within 45 days. Check the ${countyName} County Board of Tax Assessors site for the current year's notice date.`
      : `Reassessment and revaluation schedules vary by municipality in ${countyName} County. Some communities reassess annually, others on longer cycles—confirm dates with your local tax assessor.`

  const items: FAQItem[] = [
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

  // Georgia: add HB 581 opt-out FAQ where we've researched the county.
  // High-volume 2025-2026 search query; the explainer block above also
  // covers it, but the FAQ format participates in PAA / AI Overview eligibility.
  const hb581 = getHb581Status(stateSlug, countyName)
  if (hb581) {
    const bothOptedOut = hb581.county && hb581.school
    items.push({
      question: `Did ${countyName} County opt out of HB 581 (the Save Our Homes Act)?`,
      answer: bothOptedOut
        ? `Yes. Both ${countyName} County government and ${countyName} County Schools formally opted out of HB 581 for tax year ${hb581.effectiveYear}. The statewide floating homestead exemption that caps annual taxable-value increases at the rate of inflation does not apply in ${countyName} County — assessed values can rise with market appreciation, subject to the standard 40% assessment ratio. The traditional $2,000 statewide homestead exemption and any local senior or disability exemptions still apply.`
        : hb581.county
          ? `${countyName} County government opted out, but the school district remains opted in. The county portion of your bill is not subject to HB 581's cap; the school portion is. Check the ${countyName} County Board of Tax Assessors for the current status.`
          : `${countyName} County Schools opted out, but the county government remains opted in. The school portion of your bill is not subject to HB 581's cap; the county portion is. Check the ${countyName} County Board of Tax Assessors for the current status.`,
    })
  }

  return items
}
