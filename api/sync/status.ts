// GET /api/sync/status
// Header: Authorization: Bearer <SYNC_TOKEN>
// Returns just the metadata (no snapshot body) — used for "last synced" UI.

import { redis } from '../_lib/redis.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return j({ error: 'GET only' }, 405)

  const token = process.env.SYNC_TOKEN
  if (!token) {
    return j({ error: 'SYNC_TOKEN not set on server', configMissing: true }, 503)
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${token}`) {
    return j({ error: 'forbidden' }, 403)
  }

  try {
    const metaRaw = await redis().get<string | null>('sync:meta')
    if (!metaRaw) return j({ meta: null })
    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw
    return j({ meta })
  } catch (e) {
    return j({ error: 'storage failed', detail: String(e), configMissing: true }, 503)
  }
}

function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
