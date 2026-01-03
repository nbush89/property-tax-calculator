import { NextRequest, NextResponse } from 'next/server'
import { calculatePropertyTax } from '@/utils/calculateTax'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { homeValue, county, town, propertyType, exemptions = [] } = body

    if (!homeValue || !county) {
      return NextResponse.json(
        { error: 'Missing required fields: homeValue, county' },
        { status: 400 }
      )
    }

    const result = calculatePropertyTax({
      homeValue: Number(homeValue),
      county,
      town,
      propertyType,
      exemptions,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating tax:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate property tax' },
      { status: 500 }
    )
  }
}
