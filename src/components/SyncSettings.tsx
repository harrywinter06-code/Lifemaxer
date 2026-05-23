import { useEffect, useState } from 'react'
import { History } from './Icon'
import {
  fetchRemoteMeta,
  getSyncStatus,
  isConfigured,
  restoreFromCloud,
  syncUpNow,
  type SyncMeta,
  type SyncStatus,
} from '../lib/sync'

export function SyncSettings({ onChange }: { onChange?: () => void }) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const [remote, setRemote] = useState<SyncMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isConfigured()) return
      const m = await fetchRemoteMeta()
      if (cancelled) return
      setRemote(m)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = async () => {
    setStatus(getSyncStatus())
    if (isConfigured()) {
      const m = await fetchRemoteMeta()
      setRemote(m)
    }
  }

  if (!status.configured) {
    return (
      <section className="panel-pad space-y-2">
        <h3 className="shout text-sm text-volt">CLOUD SYNC</h3>
        <p className="text-xs text-dim">
          Not configured. To enable: add <code>SYNC_TOKEN</code> AND{' '}
          <code>VITE_SYNC_TOKEN</code> env vars on Vercel (same value) and
          redeploy. Reuses the Upstash Redis you already provisioned for push.
        </p>
        <p className="text-xs text-dim">
          Without sync, your data lives only in this browser. Export weekly from{' '}
          <span className="text-text">EXPORT DATA</span> below to be safe.
        </p>
      </section>
    )
  }

  const handlePush = async () => {
    setBusy(true)
    setMsg(null)
    const r = await syncUpNow()
    setMsg(r.skipped ? 'No changes since last upload.' : r.ok ? 'Snapshot pushed to cloud.' : `Failed: ${r.error}`)
    await refresh()
    setBusy(false)
  }

  const handleRestore = async () => {
    if (!confirm("Replace ALL local data with the cloud snapshot? Local-only changes since the last sync will be lost.")) return
    setBusy(true)
    setMsg(null)
    const r = await restoreFromCloud()
    setMsg(r.ok ? 'Restored. Refresh the app to see changes.' : `Failed: ${r.error}`)
    await refresh()
    setBusy(false)
    if (r.ok) onChange?.()
  }

  return (
    <section className="panel-pad space-y-3">
      <h3 className="shout text-sm text-volt flex items-center gap-2">
        <History size={16} /> CLOUD SYNC
      </h3>

      <div className="text-xs text-dim space-y-1 num">
        <Row k="Local push (this device)" v={fmtAgo(status.lastUploadAt)} />
        <Row k="Cloud snapshot" v={remote ? fmtAgo(remote.uploadedAt) : '—'} />
        {remote && <Row k="Cloud size" v={`${Math.ceil(remote.sizeBytes / 1024)} KB`} />}
        {status.error && <Row k="Last error" v={status.error} bad />}
      </div>

      <div className="flex gap-2">
        <button onClick={handlePush} disabled={busy} className="btn-volt flex-1 text-xs disabled:opacity-40">
          {busy ? '…' : 'SYNC NOW'}
        </button>
        <button onClick={handleRestore} disabled={busy} className="btn text-xs disabled:opacity-40">
          RESTORE FROM CLOUD
        </button>
      </div>

      {msg && <p className="text-xs text-dim border-t border-line pt-2">{msg}</p>}

      <p className="text-[10px] text-dim leading-snug border-t border-line pt-2">
        Auto-syncs ~30s after writes. Survives app reinstall, new phone, and
        iOS storage eviction.
      </p>
    </section>
  )
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-dim">{k}</span>
      <span className={bad ? 'text-bad' : 'text-text'}>{v}</span>
    </div>
  )
}

function fmtAgo(ts: number | null): string {
  if (!ts) return 'never'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
