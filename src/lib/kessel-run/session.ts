import { headers } from 'next/headers'
import { requireLocalSession } from '@/server/kessel-run/local-session'
/** Explicitly opted-in local access preserves the legacy resource identity. */
const SINGLE_USER_RESOURCE_ID = 'kessel-run-local-user'

export async function getResourceId(): Promise<string> {
  if (process.env.KESSEL_RUN_ENABLE_LEGACY !== '1') throw new Error('Legacy demo access is disabled')
  const origin = process.env.KESSEL_RUN_ORIGIN ?? 'http://127.0.0.1:3000'
  await requireLocalSession(new Request(`${origin}/kessel-run/projects`, { headers: await headers() }))
  return SINGLE_USER_RESOURCE_ID
}
