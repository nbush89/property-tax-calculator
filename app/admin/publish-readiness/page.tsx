import { buildPublishReviewRows } from '@/lib/admin/buildPublishReviewRows'
import { PublishReadinessConsole } from '@/components/admin'

export const dynamic = 'force-dynamic'

export default async function AdminPublishReadinessPage() {
  const rows = await buildPublishReviewRows()
  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text">Publish readiness</h1>
        <p className="mt-1 text-sm text-text-muted max-w-3xl">
          Validator output merged with editorial overrides. Overrides live in{' '}
          <code className="text-xs bg-bg px-1 rounded border border-border">
            data/admin/publish-overrides.json
          </code>{' '}
          — never in state JSON. Effective status is for future gating (sitemap, browse).
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Auth: set <code className="bg-bg px-1 rounded">ADMIN_PUBLISH_PASSWORD</code> and{' '}
          <code className="bg-bg px-1 rounded">ADMIN_PUBLISH_TOKEN</code> (long random). Dev without
          both env vars is open.
        </p>
      </div>
      <PublishReadinessConsole initialRows={rows} />
    </div>
  )
}
