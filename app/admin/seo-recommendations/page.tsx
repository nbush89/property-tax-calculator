import SeoRecommendationsConsole from '@/components/admin/SeoRecommendationsConsole'

export const dynamic = 'force-dynamic'

export default function AdminSeoRecommendationsPage() {
  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text">SEO recommendations</h1>
        <p className="mt-1 text-sm text-text-muted max-w-3xl">
          Upload a Search Console Queries export — either with a page column per row, or from a single-page filter with
          a path you enter on the form. The tool
          aggregates by page, compares live title/meta from the same generators as production routes, and
          suggests improvements with rationale. Nothing is applied automatically — use{' '}
          <a href="/admin/seo-opportunities" className="text-primary hover:underline">
            SEO opportunities
          </a>{' '}
          for landing-page CTR snapshots.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Review state:{' '}
          <code className="bg-bg px-1 rounded border border-border">data/admin/seo-recommendations.json</code>
        </p>
      </div>
      <SeoRecommendationsConsole />
    </div>
  )
}
