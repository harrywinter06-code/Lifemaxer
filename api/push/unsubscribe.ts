// POST /api/push/unsubscribe
// Body: { endpoint: string }

import { redis, KEYS, hash } from '../_lib/redis'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return j({ error: 'POST only' }, 405)
  let body: unknown
  try { body = await req.json() } catch { return j({ error: 'bad json' }, 400) }
  const endpoint =
    body && typeof body === 'object' && typeof (body as { endpoint?: unknown }).endpoint === 'string'
      ? (body as { endpoint: string }).endpoint
      : null
  if (!endpoint) return j({ error: 'endpoint required' }, 400)
  try {
    await redis().del(KEYS.sub(endpoint))
    await redis().srem(KEYS.subList, hash(endpoint))
    return j({ ok: true })
  } catch (e) {
    return j({ error: 'storage failed', detail: String(e) }, 503)
  }
}

function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
