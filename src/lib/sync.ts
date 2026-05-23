// Cloud sync client.
//
// Pushes a debounced snapshot to /api/sync/upload after any meaningful write
// (via subscribeWrite). On demand, can pull the latest cloud snapshot and
// replace the local DB (used by "Restore from cloud" or on a fresh install).

import { exportAll, importAll } from '../db/repo'
import { subscribeWrite } from './syncBus'

const TOKEN = (import.meta.env.VITE_SYNC_TOKEN ?? '') as string
const DEBOUNCE_MS = 30_000
const LS_LAST_UPLOAD = 'drill:sync:lastUpload'
const LS_LAST_HASH = 'drill:sync:lastHash'

export type SyncMeta = {
  uploadedAt: number
  sizeBytes: number
  version: number
}

export type SyncStatus = {
  configured: boolean        // VITE_SYNC_TOKEN present
  lastUploadAt: number | null
  lastUploadOk: boolean
  inFlight: boolean
  error: string | null
  remoteMeta: SyncMeta | null
}

let inFlight = false
let lastError: string | null = null
let lastOk = true
let timer: ReturnType<typeof setTimeout> | null = null
let unsubscribe: (() => void) | null = null

const ls = (): Storage | null =>
  typeof localStorage !== 'undefined' ? localStorage : null

function readLastUpload(): number | null {
  const s = ls()?.getItem(LS_LAST_UPLOAD)
  return s ? parseInt(s) : null
}

function writeLastUpload(ts: number): void {
  ls()?.setItem(LS_LAST_UPLOAD, String(ts))
}

export function isConfigured(): boolean {
  return TOKEN.length > 0
}

function authHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${TOKEN}`,
  }
}

async function snapshotHash(snap: unknown): Promise<string> {
  const s = JSON.stringify(snap)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(s)
    const out = await crypto.subtle.digest('SHA-1', buf)
    return [...new Uint8Array(out)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // fallback: length-only
  return `len-${s.length}`
}

/** Push a snapshot now. Skip if identical to last upload. */
export async function syncUpNow(): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isConfigured()) return { ok: false, error: 'VITE_SYNC_TOKEN not set' }
  if (inFlight) return { ok: false, error: 'already in flight' }
  inFlight = true
  try {
    const snap = await exportAll()
    const hash = await snapshotHash(snap)
    const prev = ls()?.getItem(LS_LAST_HASH)
    if (prev === hash) {
      lastOk = true
      lastError = null
      return { ok: true, skipped: true }
    }
    const resp = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ snapshot: snap }),
    })
    if (!resp.ok) {
      const body = (await resp.json().catch(() => null)) as { error?: string } | null
      lastOk = false
      lastError = body?.error ?? `HTTP ${resp.status}`
      return { ok: false, error: lastError }
    }
    ls()?.setItem(LS_LAST_HASH, hash)
    writeLastUpload(Date.now())
    lastOk = true
    lastError = null
    return { ok: true }
  } catch (e) {
    lastOk = false
    lastError = String(e)
    return { ok: false, error: String(e) }
  } finally {
    inFlight = false
  }
}

/** Schedule a debounced upload. Called from subscribeWrite. */
export function scheduleSync(): void {
  if (!isConfigured()) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void syncUpNow()
  }, DEBOUNCE_MS)
}

/** Mount: subscribe to writes so saves trigger a debounced upload. */
export function startAutoSync(): void {
  if (unsubscribe) return
  unsubscribe = subscribeWrite(scheduleSync)
}

export async function syncDown(): Promise<
  | { ok: true; snapshot: unknown; meta: SyncMeta | null }
  | { ok: false; error: string; status?: number }
> {
  if (!isConfigured()) return { ok: false, error: 'VITE_SYNC_TOKEN not set' }
  const resp = await fetch('/api/sync/download', {
    method: 'GET',
    headers: { authorization: `Bearer ${TOKEN}` },
  })
  if (resp.status === 404) return { ok: false, error: 'no snapshot in cloud', status: 404 }
  if (!resp.ok) {
    const body = (await resp.json().catch(() => null)) as { error?: string } | null
    return { ok: false, error: body?.error ?? `HTTP ${resp.status}`, status: resp.status }
  }
  const body = (await resp.json()) as { snapshot: unknown; meta: SyncMeta | null }
  return { ok: true, snapshot: body.snapshot, meta: body.meta }
}

export async function fetchRemoteMeta(): Promise<SyncMeta | null> {
  if (!isConfigured()) return null
  try {
    const resp = await fetch('/api/sync/status', {
      method: 'GET',
      headers: { authorization: `Bearer ${TOKEN}` },
    })
    if (!resp.ok) return null
    const body = (await resp.json()) as { meta: SyncMeta | null }
    return body.meta
  } catch {
    return null
  }
}

/** Pull cloud snapshot and overwrite local DB. */
export async function restoreFromCloud(): Promise<{ ok: boolean; error?: string }> {
  const r = await syncDown()
  if (!r.ok) return { ok: false, error: r.error }
  const snap = r.snapshot as Parameters<typeof importAll>[0]
  if (!snap) return { ok: false, error: 'cloud snapshot empty' }
  await importAll(snap)
  // Reset hash so the next syncUp doesn't skip.
  ls()?.removeItem(LS_LAST_HASH)
  return { ok: true }
}

export function getSyncStatus(): SyncStatus {
  return {
    configured: isConfigured(),
    lastUploadAt: readLastUpload(),
    lastUploadOk: lastOk,
    inFlight,
    error: lastError,
    remoteMeta: null,
  }
}
