import { z } from 'zod'

const PROPERTY_TYPE_VALUES = [
  'single_family',
  'condo',
  'townhouse',
  'multi_family',
  'commercial',
] as const

export const taxFormSchema = z.object({
  homeValue: z
    .number({ error: 'Home value is required' })
    .refine(v => Number.isFinite(v), 'Enter a valid number')
    .refine(v => v >= 1, 'Enter a home value greater than 0'),
  county: z.string().min(1, 'Please select a county'),
  town: z.string().optional(),
  propertyType: z.enum(PROPERTY_TYPE_VALUES).default('single_family'),
  exemptions: z.array(z.string()).default([]),
})

export type TaxFormValues = z.infer<typeof taxFormSchema>

/**
 * Parse raw form state (strings) into validated payload for API.
 * Returns { success: true, data } or { success: false, errors: Record<field, message> }.
 */
export function validateTaxForm(raw: {
  homeValue: string
  county: string
  town: string
  propertyType: string
  selectedExemptions: string[]
}): { success: true; data: TaxFormValues } | { success: false; errors: Record<string, string> } {
  const trimmed = raw.homeValue.trim()
  const homeValueNum =
    trimmed === ''
      ? NaN
      : (() => {
          const parsed = z.coerce.number().safeParse(raw.homeValue)
          return parsed.success ? parsed.data : NaN
        })()

  const result = taxFormSchema.safeParse({
    homeValue: homeValueNum,
    county: raw.county.trim(),
    town: raw.town.trim() || undefined,
    propertyType: raw.propertyType,
    exemptions: raw.selectedExemptions,
  })

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path[0]?.toString() ?? 'form'
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }
  return { success: false, errors }
}
