// POST /api/sync/upload
// Body: { snapshot: <exportAll() output>, sizeBytes?: number }
// Header: Authorization: Bearer <SYNC_TOKEN>
//
// Stores a single latest snapshot under sync:snapshot. Single-tenant.

import { redis } from '../_lib/redis.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return j({ error: 'POST only' }, 405)

  const token = process.env.SYNC_TOKEN
  if (!token) {
    return j({ error: 'SYNC_TOKEN not set on server', configMissing: true }, 503)
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${token}`) {
    return j({ error: 'forbidden' }, 403)
  }

  let body: unknown
  try { body = await req.json() } catch { return j({ error: 'bad json' }, 400) }
  const snap = (body as { snapshot?: unknown })?.snapshot
  if (!snap || typeof snap !== 'object') {
    return j({ error: 'snapshot required' }, 400)
  }

  const serialized = JSON.stringify(snap)
  // Sanity: cap snapshot at 5 MB to avoid runaway costs / abuse.
  if (serialized.length > 5_000_000) {
    return j({ error: 'snapshot too large', sizeBytes: serialized.length }, 413)
  }

  const meta = {
    uploadedAt: Date.now(),
    sizeBytes: serialized.length,
    version: 1,
  }

  try {
    // Pipeline two writes.
    await Promise.all([
      redis().set('sync:snapshot', serialized),
      redis().set('sync:meta', JSON.stringify(meta)),
    ])
    return j({ ok: true, ...meta })
  } catch (e) {
    return j({ error: 'storage failed', detail: String(e), configMissing: true }, 503)
  }
}

function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
