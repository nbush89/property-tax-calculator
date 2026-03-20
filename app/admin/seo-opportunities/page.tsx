import { loadSeoOpportunityRows } from '@/lib/seo/loadSeoOpportunities'
import SeoOpportunitiesConsole from '@/components/admin/SeoOpportunitiesConsole'

export const dynamic = 'force-dynamic'

export default async function AdminSeoOpportunitiesPage() {
  const rows = await loadSeoOpportunityRows()
  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text">SEO & CTR opportunities</h1>
        <p className="mt-1 text-sm text-text-muted max-w-3xl">
          Search performance (Search Console CSV) mapped to entity URLs. Triage low-CTR pages, review
          titles/meta, and track optimization work here — separate from{' '}
          <a href="/admin/publish-readiness" className="text-primary hover:underline">
            publish readiness
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Snapshots: <code className="bg-bg px-1 rounded border border-border">data/admin/search-performance-snapshots.json</code>{' '}
          · Reviews:{' '}
          <code className="bg-bg px-1 rounded border border-border">data/admin/seo-optimization-reviews.json</code>
        </p>
      </div>
      <SeoOpportunitiesConsole initialRows={rows} />
    </div>
  )
}
