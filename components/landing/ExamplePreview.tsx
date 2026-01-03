import Section from '@/components/ui/Section'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

export default function ExamplePreview() {
  return (
    <Section
      title="See Your Results"
      subtitle="Get detailed breakdowns and visualizations instantly"
    >
      <div className="mt-12 flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="bg-primary-soft">
            <h3 className="text-lg font-semibold text-text">
              Tax Calculation Results
            </h3>
          </CardHeader>

          <CardContent className="py-8">
            <div className="mb-6 text-center">
              <p className="text-sm muted mb-2">Annual Property Tax</p>
              <p className="mt-2 text-4xl font-bold text-primary tabular-nums">
                $13,250
              </p>
              <p className="mt-2 text-sm muted tabular-nums">
                $1,104 per month
              </p>
            </div>

            {/* Breakdown */}
            <div className="mb-6 space-y-3 border-t border-border pt-6">
              <div className="flex justify-between text-sm">
                <span className="muted">County Rate</span>
                <span className="font-medium text-text tabular-nums">2.31%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="muted">Municipal Rate</span>
                <span className="font-medium text-text tabular-nums">0.34%</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-sm">
                <span className="font-semibold text-text">Effective Rate</span>
                <span className="font-semibold text-text tabular-nums">2.65%</span>
              </div>
            </div>

            {/* Mini Trend Chart */}
            <div className="border-t border-border pt-6">
              <p className="mb-4 text-sm font-semibold text-text">
                5-Year Tax Trend
              </p>
              <div className="flex items-end justify-between gap-2">
                {[
                  { year: '2020', value: 60, label: '$12.5k' },
                  { year: '2021', value: 65, label: '$12.8k' },
                  { year: '2022', value: 70, label: '$13.0k' },
                  { year: '2023', value: 75, label: '$13.1k' },
                  { year: '2024', value: 80, label: '$13.3k' },
                ].map((item) => (
                  <div key={item.year} className="flex flex-1 flex-col items-center">
                    <div className="mb-2 flex h-20 w-full items-end justify-center">
                      <div
                        className="w-full rounded-t bg-primary"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>
                    <span className="text-xs muted">
                      {item.year}
                    </span>
                    <span className="mt-1 text-xs font-medium text-text tabular-nums">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}
