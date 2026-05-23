// Client-side Web Push helpers.

import { getProfile } from '../db/repo'

/** True if the browser supports the bits we need. */
export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/** True if the user has already granted permission. */
export function permissionGranted(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}
export function permissionDenied(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'denied'
}

export type PushStatus = {
  supported: boolean
  permission: 'default' | 'granted' | 'denied'
  subscribed: boolean
  endpoint?: string
  configMissing?: boolean
  error?: string
}

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '') as string

export async function getStatus(): Promise<PushStatus> {
  if (!pushSupported()) {
    return { supported: false, permission: 'default', subscribed: false }
  }
  const perm = Notification.permission as 'default' | 'granted' | 'denied'
  const reg = await navigator.serviceWorker.ready.catch(() => null)
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return {
    supported: true,
    permission: perm,
    subscribed: !!sub,
    endpoint: sub?.endpoint,
    configMissing: !VAPID_PUBLIC_KEY,
  }
}

export async function subscribe(): Promise<PushStatus> {
  if (!pushSupported()) {
    return { supported: false, permission: 'default', subscribed: false, error: 'unsupported' }
  }
  if (!VAPID_PUBLIC_KEY) {
    return {
      supported: true,
      permission: Notification.permission as PushStatus['permission'],
      subscribed: false,
      configMissing: true,
      error: 'VITE_VAPID_PUBLIC_KEY not set at build time',
    }
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return { supported: true, permission: perm, subscribed: false, error: 'permission ' + perm }
  }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const profile = await getProfile()
  const payload = sub.toJSON()
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    return {
      supported: true, permission: 'granted', subscribed: false,
      error: 'subscription returned no keys',
    }
  }
  const resp = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        endpoint: payload.endpoint,
        keys: { p256dh: payload.keys.p256dh, auth: payload.keys.auth },
      },
      schedule: profile.schedule,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  })
  if (resp.status === 503) {
    const body = await safeJson(resp)
    return {
      supported: true, permission: 'granted', subscribed: false,
      configMissing: true,
      error: (body as { error?: string })?.error ?? 'storage missing',
    }
  }
  if (!resp.ok) {
    const body = await safeJson(resp)
    return {
      supported: true, permission: 'granted', subscribed: false,
      error: (body as { error?: string })?.error ?? `HTTP ${resp.status}`,
    }
  }
  return { supported: true, permission: 'granted', subscribed: true, endpoint: sub.endpoint }
}

export async function unsubscribe(): Promise<PushStatus> {
  const reg = await navigator.serviceWorker.ready.catch(() => null)
  const sub = reg ? await reg.pushManager.getSubscription() : null
  const endpoint = sub?.endpoint
  if (sub) await sub.unsubscribe()
  if (endpoint) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => null)
  }
  return await getStatus()
}

export async function sendTest(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
  if (!resp.ok) {
    const body = await safeJson(resp)
    return { ok: false, error: (body as { error?: string })?.error ?? `HTTP ${resp.status}` }
  }
  return { ok: true }
}

async function safeJson(r: Response): Promise<unknown> {
  try {
    return await r.json()
  } catch {
    return null
  }
}

// urlBase64 → Uint8Array (VAPID public key format).
function urlBase64ToUint8Array(s: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (s.length % 4)) % 4)
  const base64 = (s + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}
