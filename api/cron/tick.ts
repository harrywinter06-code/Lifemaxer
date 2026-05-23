// GET /api/cron/tick
// Vercel Cron runs this every minute (see vercel.json crons).
// For each subscription: compute the current local HH:MM in its TZ,
// match against its derived nag schedule, and fire any due nag once
// per (date, endpoint, nagKey) using a Redis dedupe key.

import { redis, KEYS } from '../_lib/redis'
import { configureVapid } from '../_lib/push'
import type { StoredSubscription, Nag } from '../_lib/push'
import { scheduledNags, localDateKey, localHHMM } from '../_lib/nags'

export default async function handler(req: Request): Promise<Response> {
  // Vercel Cron attaches Authorization: Bearer <CRON_SECRET> (or x-vercel-cron header).
  // Verify so the endpoint isn't a public push spammer.
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (!vercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return j({ error: 'forbidden' }, 403)
  }

  let webpush: ReturnType<typeof configureVapid>
  try { webpush = configureVapid() } catch (e) {
    return j({ error: 'VAPID env vars missing', detail: String(e) }, 503)
  }

  const now = new Date()
  let fired = 0
  let subs = 0
  const errors: string[] = []

  // SCAN over push:sub:* — single user, but works for many subs.
  // @upstash/redis returns the cursor as a string; loop terminates on "0".
  let cursor: string | number = 0
  do {
    const scanResult = (await redis().scan(cursor, {
      match: 'push:sub:*',
      count: 100,
    })) as unknown as [string, string[]]
    const next = scanResult[0]
    const keys = scanResult[1]
    cursor = next
    for (const k of keys) {
      subs += 1
      let raw: string | StoredSubscription | null
      try {
        raw = (await redis().get<string | StoredSubscription | null>(k)) ?? null
      } catch (e) {
        errors.push(`get ${k}: ${String(e)}`)
        continue
      }
      if (!raw) continue
      const sub: StoredSubscription = typeof raw === 'string' ? JSON.parse(raw) : raw
      const tz = sub.tz || 'Europe/London'
      const local = localHHMM(now, tz)
      const dateKey = localDateKey(now, tz)
      const sched = scheduledNags(sub.schedule)
      const due = sched.find((s) => s.time === local)
      if (!due) continue
      const firedKey = KEYS.fired(dateKey, k.split(':').pop() ?? 'x', due.nag.key)
      // SET NX so we only fire once per (day × nag × endpoint).
      const ok = await redis().set(firedKey, '1', { nx: true, ex: 60 * 60 * 25 })
      if (!ok) continue
      try {
        await sendNag(webpush, sub, due.nag)
        fired += 1
      } catch (e) {
        const err = e as { statusCode?: number; body?: string }
        errors.push(`send ${k}: ${err.statusCode ?? ''} ${String(err.body ?? e)}`)
        // 404/410 means dead subscription — drop it.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await redis().del(k)
        }
      }
    }
  } while (String(cursor) !== '0')

  return j({ ok: true, fired, subs, errors: errors.slice(0, 5) })
}

async function sendNag(
  webpush: ReturnType<typeof configureVapid>,
  sub: StoredSubscription,
  nag: Nag,
): Promise<void> {
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: sub.keys },
    JSON.stringify({
      title: nag.title,
      body: nag.body,
      tag: nag.tag,
      url: '/',
    }),
    { TTL: 300 },
  )
}

function j(b: unknown, s = 200): Response {
  return new Response(JSON.stringify(b), {
    status: s, headers: { 'content-type': 'application/json' },
  })
}
