import { useEffect, useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { Screen } from '../components/Screen'
import {
  Activity,
  Check,
  Flame,
  Heart,
  Moon,
  Sun,
  Trophy,
  Zap,
} from '../components/Icon'
import {
  getChecklist,
  getNutrition,
  getProfile,
  getReadiness,
  listBodyweight,
  patchChecklist,
  putReadiness,
  updateProfile,
} from '../db/repo'
import { computeMode, modeCopy } from '../engines/readiness'
import { directive } from '../engines/directive'
import { evaluateBedtime, shouldNagBedtime } from '../engines/bedtime'
import type {
  BodyweightEntry,
  Checklist,
  NutritionDay,
  Profile,
  Readiness,
} from '../db/types'
import { todayISO } from '../lib/date'

export function NowScreen({ onGoTo }: { onGoTo: (t: 'train' | 'eat' | 'stats') => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [readiness, setReadinessState] = useState<Readiness | undefined>(undefined)
  const [nutrition, setNutritionState] = useState<NutritionDay | null>(null)
  const [checklist, setChecklistState] = useState<Checklist | null>(null)
  const [todaysBw, setTodaysBw] = useState<BodyweightEntry | undefined>(undefined)
  const [now, setNow] = useState(new Date())

  const refresh = async () => {
    const today = todayISO()
    const [p, r, n, c, bw] = await Promise.all([
      getProfile(),
      getReadiness(),
      getNutrition(),
      getChecklist(),
      listBodyweight(),
    ])
    setProfile(p)
    setReadinessState(r)
    setNutritionState(n)
    setChecklistState(c)
    setTodaysBw(bw.find((b) => b.date === today))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await refresh()
    })()
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const dir = useMemo(() => {
    if (!profile || !nutrition || !checklist) return null
    return directive({
      profile,
      now,
      readiness,
      todaysBodyweight: todaysBw,
      nutrition,
      checklist,
    })
  }, [profile, nutrition, checklist, readiness, todaysBw, now])

  if (!profile || !nutrition || !checklist || !dir) {
    return (
      <Screen>
        <Header title="NOW" subtitle="Loading…" />
      </Screen>
    )
  }

  const bedNag = shouldNagBedtime(profile.schedule.bed, now)
  const showCheckIn = !readiness

  return (
    <Screen>
      <Header
        title="NOW"
        subtitle={`${formatClock(now)} · streak ${profile.bedStreak}`}
      />

      {/* The single directive — biggest thing on screen */}
      <section className={`panel-pad ${dir.key === 'train' || dir.key === 'lights-out' ? 'border-volt' : ''}`}>
        <div className="shout text-3xl leading-tight text-volt">
          {dir.headline}
        </div>
        <p className="text-sm text-text/90 mt-2">{dir.sub}</p>

        <div className="flex gap-2 mt-3">
          {dir.key === 'train' && (
            <button onClick={() => onGoTo('train')} className="btn-volt flex-1">GO</button>
          )}
          {(dir.key === 'protein' || dir.key === 'finish-cal' || dir.key === 'prep') && (
            <button onClick={() => onGoTo('eat')} className="btn-volt flex-1">FUEL</button>
          )}
          {dir.key === 'scale' && (
            <button onClick={() => onGoTo('stats')} className="btn-volt flex-1">LOG WEIGHT</button>
          )}
          {dir.key === 'lights-out' && (
            <LightsOutButton
              profile={profile}
              checklist={checklist}
              now={now}
              onSaved={refresh}
            />
          )}
        </div>
      </section>

      {/* Bedtime nag */}
      {bedNag && !checklist.sleep && (
        <section className="panel-pad border-warn flex items-start gap-3">
          <Moon size={20} className="text-warn shrink-0" />
          <div className="flex-1">
            <div className="shout text-sm text-warn">10 MIN TO LIGHTS OUT.</div>
            <div className="text-xs text-dim mt-1">
              Phone face-down. Tap when you put it down — streak counts only at ≤ {profile.schedule.bed}+15m.
            </div>
            <LightsOutButton
              profile={profile}
              checklist={checklist}
              now={now}
              onSaved={refresh}
              compact
            />
          </div>
        </section>
      )}

      {/* Morning check-in */}
      {showCheckIn && (
        <ReadinessForm
          onSave={async (r) => {
            await putReadiness(r)
            await refresh()
          }}
        />
      )}

      {/* Mode banner if check-in done */}
      {readiness && (
        <section className="panel-tight flex items-center gap-2">
          <span className={`chip ${readiness.mode === 'reduced' ? 'chip-warn' : readiness.mode === 'push' ? 'chip-volt' : ''}`}>
            {readiness.mode.toUpperCase()}
          </span>
          <span className="text-sm">{modeCopy(readiness.mode)}</span>
        </section>
      )}

      {/* Five non-negotiables checklist */}
      <ChecklistView checklist={checklist} />

      {/* Footer button: open TRAIN */}
      <button
        onClick={() => onGoTo('train')}
        className="btn flex items-center justify-center gap-2"
      >
        <Activity size={16} /> OPEN TRAIN
      </button>
    </Screen>
  )
}

// ---- subcomponents ----

function ReadinessForm({ onSave }: { onSave: (r: Readiness) => Promise<void> }) {
  const [sleep, setSleep] = useState(8)
  const [sore, setSore] = useState(2)
  const [energy, setEnergy] = useState(3)

  const handleSubmit = async () => {
    const mode = computeMode({ sleep, sore, energy })
    await onSave({ date: todayISO(), sleep, sore, energy, mode })
  }

  return (
    <section className="panel-pad space-y-4">
      <header>
        <h2 className="shout text-volt text-sm">MORNING CHECK-IN</h2>
        <p className="text-xs text-dim">Honest answers. The plan adjusts.</p>
      </header>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm flex items-center gap-2"><Moon size={14} className="text-dim" /> Sleep (hours)</span>
          <span className="num text-volt">{sleep}</span>
        </div>
        <input
          type="range" min={3} max={11} step={0.5}
          value={sleep} onChange={(e) => setSleep(parseFloat(e.target.value))}
          className="w-full accent-volt"
        />
      </div>

      <ScaleRow label="Soreness" hint="1 = none · 4 = wrecked" icon={<Heart size={14} className="text-dim" />} value={sore} setValue={setSore} />
      <ScaleRow label="Energy" hint="1 = empty · 4 = primed" icon={<Sun size={14} className="text-dim" />} value={energy} setValue={setEnergy} />

      <button onClick={handleSubmit} className="btn-volt w-full">SUBMIT</button>
    </section>
  )
}

function ScaleRow({
  label, hint, icon, value, setValue,
}: { label: string; hint: string; icon: React.ReactNode; value: number; setValue: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm flex items-center gap-2">{icon} {label}</span>
        <span className="text-xs text-dim">{hint}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((v) => (
          <button
            key={v}
            onClick={() => setValue(v)}
            className={`py-3 rounded-md border num text-sm ${
              v === value
                ? 'bg-volt text-bg border-volt'
                : 'bg-panel2 text-text border-line'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChecklistView({ checklist }: { checklist: Checklist }) {
  const items: { key: keyof Omit<Checklist, 'date'>; label: string; icon: React.ReactNode }[] = [
    { key: 'train',   label: 'TRAIN',           icon: <Activity size={14} /> },
    { key: 'protein', label: 'PROTEIN HIT',     icon: <Zap size={14} /> },
    { key: 'calories',label: 'CALORIES HIT',    icon: <Flame size={14} /> },
    { key: 'prehab',  label: 'PREHAB',          icon: <Heart size={14} /> },
    { key: 'sleep',   label: 'LIGHTS OUT',      icon: <Moon size={14} /> },
  ]
  const done = items.filter((i) => checklist[i.key]).length
  return (
    <section className="panel-pad">
      <header className="flex items-center justify-between mb-3">
        <h2 className="shout text-sm text-volt">FIVE NON-NEGOTIABLES</h2>
        <span className="num text-sm">{done}/5</span>
      </header>
      <ul className="grid grid-cols-5 gap-2">
        {items.map((i) => {
          const ok = checklist[i.key]
          return (
            <li
              key={i.key}
              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-md border ${
                ok ? 'bg-volt/10 border-volt text-volt' : 'bg-panel2 border-line text-dim'
              }`}
              aria-label={`${i.label} ${ok ? 'complete' : 'incomplete'}`}
            >
              {ok ? <Check size={16} strokeWidth={3} /> : i.icon}
              <span className="shout text-[9px] tracking-widest text-center leading-tight">{i.label}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function LightsOutButton({
  profile, checklist, now, onSaved, compact = false,
}: {
  profile: Profile
  checklist: Checklist
  now: Date
  onSaved: () => Promise<void>
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  if (checklist.sleep) {
    return <span className="chip-volt">LIGHTS OUT LOGGED</span>
  }
  const handle = async () => {
    setBusy(true)
    const r = evaluateBedtime(profile.schedule.bed, now)
    // record sleep:true on today's checklist
    await patchChecklist({ sleep: true })
    if (r.onTime) {
      await updateProfile({ bedStreak: profile.bedStreak + 1 })
    } else {
      // missed by too much → streak resets
      await updateProfile({ bedStreak: 0 })
    }
    await onSaved()
    setBusy(false)
  }
  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`btn-volt ${compact ? 'mt-2 text-xs px-3 py-2' : 'flex-1 flex items-center justify-center gap-2'}`}
    >
      {busy ? '…' : (
        <>
          <Trophy size={16} /> LIGHTS OUT
        </>
      )}
    </button>
  )
}

function formatClock(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

