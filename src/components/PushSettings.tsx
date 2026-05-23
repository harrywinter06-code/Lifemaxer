import { useEffect, useState } from 'react'
import { Send, ShieldAlert } from './Icon'
import { getStatus, subscribe, unsubscribe, sendTest, type PushStatus } from '../lib/push'

export function PushSettings() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getStatus()
      if (cancelled) return
      setStatus(s)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!status) {
    return (
      <section className="panel-pad text-dim text-sm">Checking push support…</section>
    )
  }

  if (!status.supported) {
    return (
      <section className="panel-pad text-dim text-sm flex items-start gap-2">
        <ShieldAlert size={16} className="text-warn mt-0.5" />
        <div>
          Push notifications aren't supported here. iOS needs ≥16.4 with DRILL added to
          your home screen first.
        </div>
      </section>
    )
  }

  const handleEnable = async () => {
    setBusy(true)
    setMsg(null)
    const s = await subscribe()
    setStatus(s)
    if (s.subscribed) setMsg('Subscribed. Nags will fire at your scheduled times.')
    else if (s.configMissing) setMsg('Server env vars not set. See setup notes below.')
    else if (s.error) setMsg(s.error)
    setBusy(false)
  }

  const handleDisable = async () => {
    setBusy(true)
    setMsg(null)
    const s = await unsubscribe()
    setStatus(s)
    setMsg('Unsubscribed. iOS Reminders still work.')
    setBusy(false)
  }

  const handleTest = async () => {
    if (!status.endpoint) return
    setBusy(true)
    setMsg(null)
    const r = await sendTest(status.endpoint)
    setMsg(r.ok ? 'Test sent — check your notification tray.' : `Failed: ${r.error}`)
    setBusy(false)
  }

  const denied = status.permission === 'denied'

  return (
    <section className="panel-pad space-y-3">
      <h3 className="shout text-sm text-volt">PUSH NOTIFICATIONS</h3>

      {denied && (
        <p className="text-xs text-warn leading-snug">
          You denied notifications. Re-enable in your browser/iOS settings → Safari → Notifications.
        </p>
      )}

      {status.subscribed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="chip-volt">ACTIVE</span>
            <span className="text-xs text-dim">Nags fire at wake / breakfast / train / lunch / snack / dinner / wind-down / bed.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleTest} disabled={busy} className="btn-volt flex items-center gap-1 text-xs px-3 py-2 disabled:opacity-40">
              <Send size={14} /> SEND TEST
            </button>
            <button onClick={handleDisable} disabled={busy} className="btn text-xs px-3 py-2 disabled:opacity-40">
              DISABLE
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-dim">
            Push fires nags even when the app is closed. Reliable on iOS only after you
            <em> Add to Home Screen</em>.
          </p>
          <button
            onClick={handleEnable}
            disabled={busy || denied}
            className="btn-volt w-full disabled:opacity-40"
          >
            ENABLE PUSH
          </button>
        </div>
      )}

      {msg && <p className="text-xs text-dim border-t border-line pt-2">{msg}</p>}

      {status.configMissing && (
        <details className="text-xs text-dim border-t border-line pt-2">
          <summary className="cursor-pointer">Server setup (one-time)</summary>
          <ol className="list-decimal pl-4 space-y-1 mt-2">
            <li>
              Locally run <code>node scripts/gen-vapid.mjs</code> to generate VAPID keys.
            </li>
            <li>
              Create a free Upstash Redis at <code>upstash.com</code>.
            </li>
            <li>
              In Vercel → Project → Settings → Environment Variables, add:
              <code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code>,
              <code>VAPID_SUBJECT</code>, <code>VITE_VAPID_PUBLIC_KEY</code>,
              <code>UPSTASH_REDIS_REST_URL</code>, <code>UPSTASH_REDIS_REST_TOKEN</code>,
              <code>CRON_SECRET</code>.
            </li>
            <li>Redeploy.</li>
          </ol>
        </details>
      )}
    </section>
  )
}
