import Link from 'next/link'
import { adminLoginAction } from './actions'

function firstQueryString(
  value: string | string[] | undefined,
  fallback: string
): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback
}

type Props = {
  searchParams?: Promise<{ from?: string | string[]; error?: string | string[] }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {}
  const from = firstQueryString(sp.from, '/admin/publish-readiness')
  const err = firstQueryString(sp.error, '')
  const errKind = err === 'auth' || err === 'config' ? err : undefined

  const devOpen =
    process.env.NODE_ENV === 'development' &&
    !process.env.ADMIN_PUBLISH_PASSWORD &&
    !process.env.ADMIN_PUBLISH_TOKEN

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-text mb-1">Admin sign in</h1>
        <p className="text-sm text-text-muted mb-6">
          Publish readiness console.{' '}
          {devOpen ? (
            <span className="text-warning">Dev mode: auth disabled (no admin env set).</span>
          ) : (
            'Use the password configured for this environment.'
          )}
        </p>

        {devOpen ? (
          <Link
            href={from.startsWith('/admin') ? from : '/admin/publish-readiness'}
            className="inline-flex justify-center w-full rounded-lg bg-primary px-4 py-2 text-white font-medium hover:bg-primary-hover"
          >
            Continue to admin
          </Link>
        ) : (
          <form action={adminLoginAction} className="space-y-4">
            <input type="hidden" name="from" value={from} />
            {errKind === 'auth' && <p className="text-sm text-red-600">Invalid password.</p>}
            {errKind === 'config' && (
              <p className="text-sm text-red-600">
                Set ADMIN_PUBLISH_PASSWORD and ADMIN_PUBLISH_TOKEN in the environment.
              </p>
            )}
            <label className="block text-sm font-medium text-text">
              Password
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-white font-medium hover:bg-primary-hover"
            >
              Sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-text-muted">
          <Link href="/" className="text-primary hover:underline">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  )
}
