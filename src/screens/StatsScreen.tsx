import { useEffect, useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { Screen } from '../components/Screen'
import { WeightChart } from '../components/Weight'
import { PushSettings } from '../components/PushSettings'
import { SyncSettings } from '../components/SyncSettings'
import {
  Brain,
  ChevronRight,
  Settings,
  ShieldAlert,
  TrendingUp,
} from '../components/Icon'
import {
  exportAll,
  getProfile,
  listBodyweight,
  listPain,
  putBodyweight,
  putPain,
  recentSessions,
  updateProfile,
} from '../db/repo'
import { dietNudge } from '../engines/diet'
import { deloadStatus } from '../engines/deload'
import type { BodyweightEntry, PainEntry, Profile, WorkoutSession } from '../db/types'
import { todayISO } from '../lib/date'

const RED_FLAGS =
  'See a sports physio if: sharp pain, night pain, swelling, locking, giving way, numbness/tingling, or no improvement in 6–8 weeks.'

export function StatsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bw, setBw] = useState<BodyweightEntry[]>([])
  const [pain, setPain] = useState<PainEntry[]>([])
  const [recent, setRecent] = useState<WorkoutSession[]>([])
  const [showSettings, setShowSettings] = useState(false)

  const refresh = async () => {
    const [p, w, pn, r] = await Promise.all([
      getProfile(),
      listBodyweight(),
      listPain(),
      recentSessions(60),
    ])
    setProfile(p)
    setBw(w)
    setPain(pn)
    setRecent(r)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const nudge = useMemo(() => dietNudge(bw), [bw])
  const deload = useMemo(
    () => (profile ? deloadStatus(profile, recent) : null),
    [profile, recent],
  )

  if (!profile || !deload) {
    return (
      <Screen>
        <Header title="STATS" subtitle="Loading…" />
      </Screen>
    )
  }

  if (showSettings) {
    return (
      <SettingsView
        profile={profile}
        onBack={() => setShowSettings(false)}
        onChange={async (p) => {
          await updateProfile(p)
          await refresh()
        }}
      />
    )
  }

  const latestBw = bw.length ? bw[bw.length - 1].kg : profile.bodyweightKg

  return (
    <Screen>
      <Header title="STATS" subtitle={`Week ${profile.weekNum} · ${recent.length} sessions logged`} />

      {/* Bodyweight + chart */}
      <section className="panel-pad space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="shout text-xs text-dim tracking-widest">BODYWEIGHT</div>
            <div className="num text-3xl text-volt mt-1">{latestBw.toFixed(1)}</div>
            <div className="text-xs text-dim">kg · latest logged</div>
          </div>
          <BodyweightEntryForm
            onSave={async (kg) => {
              await putBodyweight(todayISO(), kg)
              await refresh()
            }}
          />
        </div>
        <WeightChart entries={bw} />
      </section>

      {/* Diet nudge */}
      <section className={`panel-pad ${nudgeBorder(nudge.suggestion)}`}>
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className={nudgeIconColor(nudge.suggestion)} />
          <div className="flex-1">
            <div className="shout text-sm">{nudge.message}</div>
            <div className="text-xs text-dim mt-1">
              {nudge.kgPerWeek === null
                ? 'Need ≥3 weigh-ins to compute kg/week.'
                : `Trend: ${nudge.kgPerWeek.toFixed(2)} kg/wk · target 0.3–0.5.`}
            </div>
            {nudge.kcalDelta !== 0 && (
              <button
                onClick={async () => {
                  if (!profile) return
                  await updateProfile({
                    targets: {
                      ...profile.targets,
                      kcal: profile.targets.kcal + nudge.kcalDelta,
                    },
                  })
                  await refresh()
                }}
                className="btn-volt text-xs mt-2 px-3 py-2"
              >
                APPLY {nudge.kcalDelta > 0 ? '+' : ''}{nudge.kcalDelta} kcal
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Deload countdown */}
      <section className={`panel-pad ${deload.isDeload ? 'border-warn' : ''}`}>
        <div className="flex items-start gap-3">
          <Brain size={20} className={deload.isDeload ? 'text-warn' : 'text-volt'} />
          <div className="flex-1">
            <div className="shout text-sm">
              {deload.isDeload
                ? deload.reason === 'window'
                  ? 'DELOAD WEEK — DROP THE VOLUME.'
                  : 'STALL DETECTED — DELOAD NOW.'
                : `${deload.weeksUntilDeload} WK TO DELOAD.`}
            </div>
            <div className="text-xs text-dim mt-1">
              {deload.isDeload
                ? '≈50% sets, lighter, 3–4 RIR all sets. Recover. Come back hungry.'
                : 'Volume climbs until deload week. Stalls trigger early.'}
            </div>
            {deload.isDeload && (
              <button
                onClick={async () => {
                  if (!profile) return
                  await updateProfile({ startDate: todayISO() })
                  await refresh()
                }}
                className="btn text-xs mt-2 px-3 py-2"
              >
                DELOAD COMPLETE — RESET CYCLE
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Pain logger */}
      <section className="panel-pad space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="shout text-sm text-volt">JOINT PAIN (0–10)</h2>
          <ShieldAlert size={16} className="text-warn" />
        </div>
        <PainSlider
          label="Shoulder"
          last={pain.length ? pain[pain.length - 1].shoulder : 0}
          onSave={async (val) => {
            const last = pain.length ? pain[pain.length - 1] : null
            await putPain({
              date: todayISO(),
              shoulder: val,
              knee: last?.knee ?? 0,
            })
            await refresh()
          }}
        />
        <PainSlider
          label="Knee"
          last={pain.length ? pain[pain.length - 1].knee : 0}
          onSave={async (val) => {
            const last = pain.length ? pain[pain.length - 1] : null
            await putPain({
              date: todayISO(),
              shoulder: last?.shoulder ?? 0,
              knee: val,
            })
            await refresh()
          }}
        />
        <p className="text-xs text-warn leading-snug border-t border-line pt-2">
          {RED_FLAGS}
        </p>
      </section>

      {/* settings + export */}
      <SyncSettings onChange={refresh} />
      <PushSettings />

      <section className="space-y-2">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full panel-pad flex items-center justify-between active:bg-panel2"
        >
          <span className="flex items-center gap-2 shout text-sm">
            <Settings size={18} /> SETTINGS
          </span>
          <ChevronRight size={18} className="text-dim" />
        </button>
        <ExportButton />
      </section>
    </Screen>
  )
}

function BodyweightEntryForm({ onSave }: { onSave: (kg: number) => Promise<void> }) {
  const [val, setVal] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const kg = parseFloat(val)
        if (Number.isFinite(kg) && kg > 0 && kg < 500) {
          onSave(kg).then(() => setVal(''))
        }
      }}
      className="flex items-center gap-2"
    >
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder="kg"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-20 bg-bg border border-line rounded-md px-2 py-2 num text-right focus:border-volt outline-none"
        aria-label="bodyweight in kg"
      />
      <button type="submit" className="btn-volt px-3 py-2 text-xs">LOG</button>
    </form>
  )
}

function PainSlider({
  label,
  last,
  onSave,
}: {
  label: string
  last: number
  onSave: (val: number) => Promise<void>
}) {
  const [val, setVal] = useState(last)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className={`num text-sm ${val >= 5 ? 'text-warn' : val >= 3 ? 'text-warn/80' : 'text-volt'}`}>
          {val}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={val}
        onChange={(e) => setVal(parseInt(e.target.value))}
        onMouseUp={() => onSave(val)}
        onTouchEnd={() => onSave(val)}
        className="w-full accent-volt"
        aria-label={`${label} pain 0-10`}
      />
    </div>
  )
}

function ExportButton() {
  const [lastTs, setLastTs] = useState<number | null>(() => {
    if (typeof localStorage === 'undefined') return null
    const v = localStorage.getItem('drill:lastExportAt')
    return v ? parseInt(v) : null
  })
  const onExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drill-export-${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    const ts = Date.now()
    localStorage.setItem('drill:lastExportAt', String(ts))
    setLastTs(ts)
  }
  // eslint-disable-next-line react-hooks/purity -- display-only "days ago"; intentional re-eval on render
  const daysAgo = lastTs ? Math.floor((Date.now() - lastTs) / 86400000) : null
  const stale = daysAgo === null || daysAgo >= 7
  return (
    <div className="space-y-1">
      <button onClick={onExport} className={`w-full ${stale ? 'btn-volt' : 'btn'}`}>
        EXPORT DATA (JSON)
      </button>
      <p className="text-[10px] text-dim text-center shout tracking-widest">
        Last manual export: {lastTs ? `${daysAgo}d ago` : 'never'}
        {stale ? ' · DUE FOR BACKUP' : ''}
      </p>
    </div>
  )
}

// ----- Settings sub-view -----

function SettingsView({
  profile,
  onBack,
  onChange,
}: {
  profile: Profile
  onBack: () => void
  onChange: (p: Partial<Profile>) => Promise<void>
}) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onChange(draft)
    setSaving(false)
    onBack()
  }

  return (
    <Screen>
      <Header title="SETTINGS" subtitle="Schedule · targets · bodyweight" />

      <section className="panel-pad space-y-3">
        <h3 className="shout text-sm text-volt">SCHEDULE</h3>
        <TimeField
          label="Wake"
          value={draft.schedule.wake}
          onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, wake: v } })}
        />
        <TimeField
          label="Train"
          value={draft.schedule.train}
          onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, train: v } })}
        />
        <TimeField
          label="Bedtime"
          value={draft.schedule.bed}
          onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, bed: v } })}
        />
      </section>

      <section className="panel-pad space-y-3">
        <h3 className="shout text-sm text-volt">TARGETS (DAILY)</h3>
        <NumField
          label="Calories"
          value={draft.targets.kcal}
          onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, kcal: v } })}
        />
        <NumField
          label="Protein (g)"
          value={draft.targets.protein}
          onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, protein: v } })}
        />
        <NumField
          label="Fat (g)"
          value={draft.targets.fat}
          onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, fat: v } })}
        />
        <NumField
          label="Carbs (g)"
          value={draft.targets.carbs}
          onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, carbs: v } })}
        />
      </section>

      <section className="panel-pad space-y-3">
        <h3 className="shout text-sm text-volt">BODY</h3>
        <NumField
          label="Bodyweight (kg)"
          value={draft.bodyweightKg}
          onChange={(v) => setDraft({ ...draft, bodyweightKg: v })}
          step={0.1}
        />
        <NumField
          label="Height (cm)"
          value={draft.heightCm}
          onChange={(v) => setDraft({ ...draft, heightCm: v })}
        />
        <NumField
          label="Age"
          value={draft.age}
          onChange={(v) => setDraft({ ...draft, age: v })}
        />
      </section>

      <div className="flex gap-2">
        <button onClick={onBack} className="btn flex-1">CANCEL</button>
        <button onClick={save} disabled={saving} className="btn-volt flex-1 disabled:opacity-40">
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </Screen>
  )
}

function TimeField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg border border-line rounded-md px-3 py-2 num focus:border-volt outline-none"
      />
    </label>
  )
}
function NumField({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-28 bg-bg border border-line rounded-md px-3 py-2 num text-right focus:border-volt outline-none"
        aria-label={label}
      />
    </label>
  )
}

function nudgeBorder(s: 'hold' | 'increase' | 'decrease') {
  if (s === 'increase') return 'border-volt'
  if (s === 'decrease') return 'border-warn'
  return ''
}
function nudgeIconColor(s: 'hold' | 'increase' | 'decrease') {
  if (s === 'increase') return 'text-volt'
  if (s === 'decrease') return 'text-warn'
  return 'text-dim'
}

