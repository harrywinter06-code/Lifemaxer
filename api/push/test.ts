// POST /api/push/test
// Body: { endpoint: string }
// Sends a one-off test notification to the given endpoint.
// Node runtime (web-push uses Node crypto).

import { redis, KEYS } from '../_lib/redis.js'
import { configureVapid } from '../_lib/push.js'
import type { StoredSubscription } from '../_lib/push.js'

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') return j({ error: 'POST only' }, 405)
    let body: unknown
    try { body = await req.json() } catch { return j({ error: 'bad json' }, 400) }
    const endpoint =
      body && typeof body === 'object' && typeof (body as { endpoint?: unknown }).endpoint === 'string'
        ? (body as { endpoint: string }).endpoint
        : null
    if (!endpoint) return j({ error: 'endpoint required' }, 400)

    let webpush: ReturnType<typeof configureVapid>
    try { webpush = configureVapid() } catch (e) {
      return j({ error: 'VAPID env vars missing', detail: String(e), configMissing: true }, 503)
    }

    let stored: StoredSubscription | null
    try {
      const raw = (await redis().get<string | StoredSubscription | null>(KEYS.sub(endpoint))) ?? null
      if (typeof raw === 'string') {
        stored = JSON.parse(raw) as StoredSubscription
      } else {
        stored = raw
      }
    } catch (e) {
      return j({ error: 'storage failed', detail: String(e), configMissing: true }, 503)
    }
    if (!stored) return j({ error: 'no subscription on file' }, 404)

    try {
      await webpush.sendNotification(
        { endpoint: stored.endpoint, keys: stored.keys },
        JSON.stringify({
          title: 'DRILL.',
          body: 'Notifications are live. Phone face-down between sets.',
          tag: 'test',
          url: '/',
        }),
        { TTL: 60 },
      )
      return j({ ok: true })
    } catch (e: unknown) {
      const err = e as { statusCode?: number; body?: string }
      return j(
        { error: 'push send failed', status: err.statusCode, body: err.body, detail: String(e) },
        502,
      )
    }
  },
}

function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
