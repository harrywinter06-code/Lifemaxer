import { useState } from 'react'
import { ChevronRight, ChevronLeft } from '../components/Icon'
import { DEFAULT_PROFILE } from '../data/seed'
import { updateProfile } from '../db/repo'
import type { Profile } from '../db/types'

const STEPS = ['intro', 'body', 'schedule', 'targets', 'confirm'] as const
type StepKey = (typeof STEPS)[number]

export function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const [draft, setDraft] = useState<Profile>({ ...DEFAULT_PROFILE })
  const [stepIdx, setStepIdx] = useState(0)
  const step: StepKey = STEPS[stepIdx]

  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))
  const back = () => setStepIdx((i) => Math.max(0, i - 1))

  const finish = async () => {
    await updateProfile({ ...draft, onboarded: true })
    onDone()
  }

  return (
    <div className="min-h-full safe-pt safe-pb safe-px flex flex-col mx-auto max-w-app">
      <header className="pt-6 pb-2">
        <div className="font-display text-volt text-5xl tracking-[0.15em] leading-none">
          DRILL
        </div>
        <div className="shout text-xs text-dim tracking-widest mt-2">
          STEP {stepIdx + 1} / {STEPS.length}
        </div>
        <div className="h-1 mt-2 rounded bg-panel2 overflow-hidden">
          <div
            className="h-full bg-volt transition-all"
            style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 py-6 space-y-4">
        {step === 'intro' && (
          <div className="space-y-3">
            <h2 className="shout text-2xl text-volt leading-tight">
              MAXIMUM MUSCLE.<br />NO EXCUSES.
            </h2>
            <p className="text-sm text-text/90 leading-relaxed">
              Six days a week. Joint-safe lifts. Calorie surplus. Lights out at 23:00.
              You will follow orders. I won't insult your body — I will be ruthless
              about your <em>actions</em>.
            </p>
            <p className="text-xs text-dim">
              Quick setup. You can change all of this later in Settings.
            </p>
          </div>
        )}

        {step === 'body' && (
          <div className="space-y-3">
            <h2 className="shout text-2xl text-volt">BODY</h2>
            <Field label="Bodyweight (kg)" value={draft.bodyweightKg} step={0.1}
              onChange={(v) => setDraft({ ...draft, bodyweightKg: v })} />
            <Field label="Height (cm)" value={draft.heightCm}
              onChange={(v) => setDraft({ ...draft, heightCm: v })} />
            <Field label="Age" value={draft.age}
              onChange={(v) => setDraft({ ...draft, age: v })} />
          </div>
        )}

        {step === 'schedule' && (
          <div className="space-y-3">
            <h2 className="shout text-2xl text-volt">SCHEDULE</h2>
            <p className="text-xs text-dim">
              Train mid-morning — quiet gym, optimal energy after one meal.
            </p>
            <Time label="Wake" value={draft.schedule.wake}
              onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, wake: v } })} />
            <Time label="Train" value={draft.schedule.train}
              onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, train: v } })} />
            <Time label="Bedtime" value={draft.schedule.bed}
              onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, bed: v } })} />
          </div>
        )}

        {step === 'targets' && (
          <div className="space-y-3">
            <h2 className="shout text-2xl text-volt">TARGETS</h2>
            <p className="text-xs text-dim">
              Maintenance ≈ 3000 kcal. +400 kcal surplus = ~0.3–0.5 kg/wk.
              Protein ≈ 2 g/kg. Auto-tunes weekly from the scale.
            </p>
            <Field label="Calories" value={draft.targets.kcal}
              onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, kcal: v } })} />
            <Field label="Protein (g)" value={draft.targets.protein}
              onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, protein: v } })} />
            <Field label="Fat (g)" value={draft.targets.fat}
              onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, fat: v } })} />
            <Field label="Carbs (g)" value={draft.targets.carbs}
              onChange={(v) => setDraft({ ...draft, targets: { ...draft.targets, carbs: v } })} />
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <h2 className="shout text-2xl text-volt">READY.</h2>
            <p className="text-sm text-text/90">
              You start on Day 1 — PUSH A. Tomorrow: PULL A. The program runs
              itself. Your job is to show up, log everything, and never miss
              lights out.
            </p>
            <div className="panel-pad text-xs text-dim space-y-1 num">
              <Row k="Bodyweight" v={`${draft.bodyweightKg} kg`} />
              <Row k="Height" v={`${draft.heightCm} cm`} />
              <Row k="Wake / Train / Bed" v={`${draft.schedule.wake} / ${draft.schedule.train} / ${draft.schedule.bed}`} />
              <Row k="Kcal target" v={`${draft.targets.kcal}`} />
              <Row k="Protein target" v={`${draft.targets.protein} g`} />
            </div>
          </div>
        )}
      </main>

      <footer className="pt-2 pb-6 flex gap-2">
        {stepIdx > 0 && (
          <button onClick={back} className="btn flex items-center gap-1 px-3">
            <ChevronLeft size={16} /> BACK
          </button>
        )}
        <div className="flex-1" />
        {stepIdx < STEPS.length - 1 ? (
          <button onClick={next} className="btn-volt flex items-center gap-1 px-5">
            NEXT <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={finish} className="btn-volt flex items-center gap-1 px-5">
            BEGIN <ChevronRight size={16} />
          </button>
        )}
      </footer>
    </div>
  )
}

function Field({
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
      />
    </label>
  )
}

function Time({
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-dim">{k}</span>
      <span className="text-text">{v}</span>
    </div>
  )
}
