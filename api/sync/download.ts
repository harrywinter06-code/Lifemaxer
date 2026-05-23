// GET /api/sync/download
// Header: Authorization: Bearer <SYNC_TOKEN>
// Returns { snapshot, meta } or 404 if no snapshot exists.

import { redis } from '../_lib/redis'

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
    const [snapRaw, metaRaw] = await Promise.all([
      redis().get<string | null>('sync:snapshot'),
      redis().get<string | null>('sync:meta'),
    ])
    if (!snapRaw) return j({ snapshot: null, meta: null }, 404)
    const snapshot = typeof snapRaw === 'string' ? JSON.parse(snapRaw) : snapRaw
    const meta = metaRaw
      ? (typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw)
      : null
    return j({ snapshot, meta })
  } catch (e) {
    return j({ error: 'storage failed', detail: String(e), configMissing: true }, 503)
  }
}

function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
