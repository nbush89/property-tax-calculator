/**
 * Server-only guard for admin mutations. Align with middleware cookie rules.
 */

import { cookies } from 'next/headers'

export function isAdminDevOpen(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    !process.env.ADMIN_PUBLISH_PASSWORD &&
    !process.env.ADMIN_PUBLISH_TOKEN
  )
}

export async function assertAdminSession(): Promise<void> {
  if (isAdminDevOpen()) return

  const expected = process.env.ADMIN_PUBLISH_TOKEN
  const session = (await cookies()).get('admin_session')?.value
  if (!expected || session !== expected) {
    throw new Error('Unauthorized admin action')
  }
}
