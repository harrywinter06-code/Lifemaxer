// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON, schedule: {wake,train,bed}, tz: string }
//
// Stores the subscription in Upstash so the cron tick can fire nags.
// Node runtime (web-push isn't Edge-compatible).

import { redis, KEYS, hash } from '../_lib/redis'
import type { StoredSubscription } from '../_lib/push'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return j({ error: 'POST only' }, 405)

  let body: unknown
  try { body = await req.json() } catch { return j({ error: 'bad json' }, 400) }
  const v = validate(body)
  if (!v) return j({ error: 'invalid payload' }, 400)

  try {
    const stored: StoredSubscription = {
      endpoint: v.subscription.endpoint,
      keys: v.subscription.keys,
      schedule: v.schedule,
      tz: v.tz,
      createdAt: Date.now(),
    }
    const key = KEYS.sub(stored.endpoint)
    await redis().set(key, JSON.stringify(stored))
    await redis().sadd(KEYS.subList, hash(stored.endpoint))
    return j({ ok: true, endpointHash: hash(stored.endpoint) })
  } catch (e) {
    return j({ error: 'storage failed', detail: String(e), configMissing: true }, 503)
  }
}

type Valid = {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  schedule: { wake: string; train: string; bed: string }
  tz: string
}
function validate(b: unknown): Valid | null {
  if (!b || typeof b !== 'object') return null
  const o = b as Record<string, unknown>
  const sub = o.subscription as Record<string, unknown> | undefined
  const sch = o.schedule as Record<string, unknown> | undefined
  const tz = o.tz
  if (!sub || !sch || typeof tz !== 'string') return null
  const keys = sub.keys as Record<string, unknown> | undefined
  if (typeof sub.endpoint !== 'string' || !keys ||
      typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null
  if (!isHHMM(sch.wake) || !isHHMM(sch.train) || !isHHMM(sch.bed)) return null
  return {
    subscription: {
      endpoint: sub.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    },
    schedule: { wake: sch.wake as string, train: sch.train as string, bed: sch.bed as string },
    tz,
  }
}
function isHHMM(v: unknown): boolean {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)
}
function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
