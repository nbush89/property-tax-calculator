'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function adminLoginAction(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '')
  const fromRaw = String(formData.get('from') ?? '/admin/publish-readiness')
  const from = fromRaw.startsWith('/admin') ? fromRaw : '/admin/publish-readiness'

  const devOpen =
    process.env.NODE_ENV === 'development' &&
    !process.env.ADMIN_PUBLISH_PASSWORD &&
    !process.env.ADMIN_PUBLISH_TOKEN

  if (devOpen) {
    redirect(from)
  }

  const expectedPw = process.env.ADMIN_PUBLISH_PASSWORD
  const token = process.env.ADMIN_PUBLISH_TOKEN

  if (!expectedPw || !token) {
    redirect('/admin/login?error=config')
  }

  if (password !== expectedPw) {
    redirect(`/admin/login?error=auth&from=${encodeURIComponent(from)}`)
  }

  const store = await cookies()
  store.set('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect(from)
}
