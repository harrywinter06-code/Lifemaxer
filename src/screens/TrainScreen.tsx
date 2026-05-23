import { useEffect, useMemo, useState } from 'react'
import { Check, Trophy, ChevronRight } from '../components/Icon'
import { Header } from '../components/Header'
import { Screen } from '../components/Screen'
import { getDayByIndex } from '../data/program'
import { PREHAB } from '../data/prehab'
import {
  addSession,
  getProfile,
  getReadiness,
  lastSessionForExercise,
  listSwaps,
  patchChecklist,
  updateProfile,
} from '../db/repo'
import { applyMode, modeCopy, type ReadinessMode } from '../engines/readiness'
import { progressionAdvice } from '../engines/progression'
import type { ExerciseRow, ProgramDay } from '../data/types'
import type { LoggedSet, Swap } from '../db/types'
import { todayISO } from '../lib/date'

type LoggerState = Record<string, { w: string; r: string }[]>

export function TrainScreen({ onFinish }: { onFinish: () => void }) {
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState<ProgramDay | null>(null)
  const [adjustedExercises, setAdjustedExercises] = useState<ExerciseRow[]>([])
  const [mode, setMode] = useState<ReadinessMode>('normal')
  const [swaps, setSwaps] = useState<Swap[]>([])
  const [history, setHistory] = useState<Record<string, LoggedSet[] | null>>({})
  const [prehabDone, setPrehabDone] = useState<boolean[]>([])
  const [log, setLog] = useState<LoggerState>({})
  const [saving, setSaving] = useState(false)
  const [savedBanner, setSavedBanner] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await getProfile()
      const programDay = getDayByIndex(profile.programDay)
      const readiness = await getReadiness()
      const m: ReadinessMode = readiness?.mode ?? 'normal'
      const adjusted = applyMode(programDay.exercises, m)
      const allSwaps = await listSwaps()
      const historyMap: Record<string, LoggedSet[] | null> = {}
      for (const ex of adjusted) {
        const last = await lastSessionForExercise(ex.exId)
        historyMap[ex.exId] = last ? last.sets : null
      }
      if (cancelled) return
      setDay(programDay)
      setMode(m)
      setAdjustedExercises(adjusted)
      setSwaps(allSwaps)
      setHistory(historyMap)
      setPrehabDone(Array(PREHAB[programDay.prehab].length).fill(false))
      // pre-fill log rows
      const initLog: LoggerState = {}
      for (const ex of adjusted) {
        const last = historyMap[ex.exId]
        initLog[ex.exId] = Array.from({ length: ex.sets }, () => ({
          w: last && last[0] ? String(last[0].w) : '',
          r: '',
        }))
      }
      setLog(initLog)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allPrehabDone = useMemo(
    () => prehabDone.length > 0 && prehabDone.every(Boolean),
    [prehabDone],
  )

  const hasAnyLoggedSet = useMemo(() => {
    return Object.values(log).some((rows) =>
      rows.some((r) => isPositive(r.w) && isPositive(r.r)),
    )
  }, [log])

  if (loading || !day) {
    return (
      <Screen>
        <Header title="TRAIN" subtitle="Loading session…" />
      </Screen>
    )
  }

  const displayName = (ex: ExerciseRow) => {
    const swap = swaps.find((s) => s.exId === ex.exId)
    return swap?.newName ?? ex.name
  }

  const togglePrehab = (i: number) =>
    setPrehabDone((arr) => arr.map((v, idx) => (idx === i ? !v : v)))

  const updateSet = (
    exId: string,
    idx: number,
    field: 'w' | 'r',
    value: string,
  ) => {
    setLog((prev) => ({
      ...prev,
      [exId]: prev[exId].map((row, i) =>
        i === idx ? { ...row, [field]: value } : row,
      ),
    }))
  }

  const finish = async () => {
    if (!day || !hasAnyLoggedSet || saving) return
    setSaving(true)
    const sessionExercises = adjustedExercises.map((ex) => {
      const rows = log[ex.exId] ?? []
      const sets: LoggedSet[] = rows
        .map((r) => ({ w: parseFloat(r.w), r: parseFloat(r.r) }))
        .filter((s) => Number.isFinite(s.w) && Number.isFinite(s.r) && s.w > 0 && s.r > 0)
      return {
        exId: ex.exId,
        name: displayName(ex),
        sets,
      }
    })

    await addSession({
      date: todayISO(),
      dayId: day.dayId,
      mode,
      exercises: sessionExercises,
    })
    const profile = await getProfile()
    await updateProfile({ programDay: profile.programDay + 1 })
    await patchChecklist({ train: true, prehab: allPrehabDone })

    setSavedBanner(true)
    setSaving(false)
    setTimeout(() => {
      setSavedBanner(false)
      onFinish()
    }, 900)
  }

  const prehabItems = PREHAB[day.prehab]

  return (
    <Screen>
      <Header
        title="TRAIN"
        subtitle={`${day.label}`}
      />

      {savedBanner && (
        <div className="panel-pad bg-volt text-bg flex items-center gap-2">
          <Trophy size={18} /> <span className="shout">SESSION LOGGED.</span>
        </div>
      )}

      {/* mode banner */}
      <div className={`panel-tight flex items-center gap-2 ${modeBannerColor(mode)}`}>
        <span className={`chip ${modeChipColor(mode)}`}>{mode.toUpperCase()}</span>
        <span className="text-sm text-text/90">{modeCopy(mode)}</span>
      </div>

      {/* prehab — mandatory */}
      <section className="panel-pad">
        <div className="flex items-center justify-between mb-2">
          <h2 className="shout text-sm tracking-widest text-volt">
            {day.prehab === 'shoulder' ? 'SHOULDER PREHAB' : 'KNEE PREHAB'}
          </h2>
          <span className={allPrehabDone ? 'chip-volt' : 'chip-warn'}>
            {allPrehabDone ? 'CLEAR' : 'MANDATORY'}
          </span>
        </div>
        <ul className="space-y-2">
          {prehabItems.map((p, i) => (
            <li key={p.name}>
              <button
                onClick={() => togglePrehab(i)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-line bg-panel2 active:scale-[0.99] transition"
              >
                <div className="text-left">
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-dim num">{p.detail}</div>
                </div>
                <div
                  className={`w-6 h-6 rounded border ${
                    prehabDone[i]
                      ? 'bg-volt border-volt text-bg'
                      : 'border-line text-transparent'
                  } flex items-center justify-center`}
                  aria-label={prehabDone[i] ? 'done' : 'incomplete'}
                >
                  <Check size={16} strokeWidth={3} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* exercises */}
      <section className="space-y-3">
        {adjustedExercises.map((ex, idx) => {
          const advice = progressionAdvice(ex, history[ex.exId])
          const rows = log[ex.exId]
          return (
            <article key={ex.exId} className="panel-pad space-y-3">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs shout text-dim">EX {idx + 1}</div>
                  <h3 className="shout text-lg leading-tight">{displayName(ex)}</h3>
                  <div className="text-xs text-dim mt-1 num">
                    {ex.sets} × {ex.lo === ex.hi ? `${ex.lo}` : `${ex.lo}–${ex.hi}`} · RIR {ex.rir} · {ex.type}
                  </div>
                </div>
              </header>
              <div className="p-3 rounded-md bg-bg border border-line">
                <div className="text-volt shout text-sm leading-snug">
                  {advice.headline}
                </div>
                <div className="text-dim text-xs mt-1">{advice.sub}</div>
              </div>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="chip w-12 text-center shrink-0">
                      SET {i + 1}
                    </span>
                    <NumberField
                      label="kg"
                      value={row.w}
                      onChange={(v) => updateSet(ex.exId, i, 'w', v)}
                      placeholder="kg"
                    />
                    <NumberField
                      label="reps"
                      value={row.r}
                      onChange={(v) => updateSet(ex.exId, i, 'r', v)}
                      placeholder="reps"
                    />
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <button
        disabled={!hasAnyLoggedSet || !allPrehabDone || saving}
        onClick={finish}
        className="btn-volt w-full flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {saving ? 'SAVING…' : 'FINISH SESSION'}
        <ChevronRight size={18} />
      </button>
      {!allPrehabDone && (
        <p className="text-warn text-xs text-center -mt-2 shout">
          PREHAB FIRST. NO EXCEPTIONS.
        </p>
      )}
    </Screen>
  )
}

function NumberField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
}) {
  return (
    <label className="flex-1 relative">
      <input
        inputMode="decimal"
        type="number"
        step="0.5"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg border border-line rounded-md px-3 py-3 num text-base focus:border-volt outline-none"
        aria-label={label}
      />
    </label>
  )
}

function isPositive(s: string) {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0
}

function modeBannerColor(m: ReadinessMode) {
  if (m === 'reduced') return 'border-warn'
  if (m === 'push') return 'border-volt'
  return ''
}
function modeChipColor(m: ReadinessMode) {
  if (m === 'reduced') return 'chip-warn'
  if (m === 'push') return 'chip-volt'
  return ''
}

