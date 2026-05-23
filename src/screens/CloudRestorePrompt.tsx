import { useEffect, useState } from 'react'
import { fetchRemoteMeta, restoreFromCloud, type SyncMeta } from '../lib/sync'

export function CloudRestorePrompt({ onDone }: { onDone: () => void }) {
  const [meta, setMeta] = useState<SyncMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const m = await fetchRemoteMeta()
      if (cancelled) return
      setMeta(m)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleRestore = async () => {
    setBusy(true)
    setErr(null)
    const r = await restoreFromCloud()
    if (!r.ok) {
      setErr(r.error ?? 'restore failed')
      setBusy(false)
      return
    }
    onDone()
  }

  const handleFresh = () => {
    onDone()
  }

  return (
    <div className="min-h-full safe-pt safe-pb safe-px flex flex-col mx-auto max-w-app">
      <header className="pt-8 pb-4">
        <div className="font-display text-volt text-5xl tracking-[0.15em] leading-none">
          DRILL
        </div>
      </header>

      <main className="flex-1 space-y-4">
        <h2 className="shout text-2xl text-volt leading-tight">
          YOUR DATA IS IN THE CLOUD.
        </h2>
        <p className="text-sm text-text/90">
          A previous device backed up to this account. Restore it now, or start fresh.
        </p>

        {meta && (
          <div className="panel-pad text-xs text-dim num space-y-1">
            <Row k="Last backup" v={new Date(meta.uploadedAt).toLocaleString()} />
            <Row k="Snapshot size" v={`${Math.ceil(meta.sizeBytes / 1024)} KB`} />
          </div>
        )}

        {err && <p className="text-bad text-sm">{err}</p>}
      </main>

      <footer className="pt-4 pb-6 space-y-2">
        <button
          onClick={handleRestore}
          disabled={busy}
          className="btn-volt w-full disabled:opacity-40"
        >
          {busy ? 'RESTORING…' : 'RESTORE FROM CLOUD'}
        </button>
        <button
          onClick={handleFresh}
          disabled={busy}
          className="btn w-full disabled:opacity-40"
        >
          START FRESH
        </button>
      </footer>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-dim">{k}</span>
      <span className="text-text">{v}</span>
    </div>
  )
}
