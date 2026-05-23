// Engine B — readiness autoregulation. SPEC §7B.

import type { ExerciseRow } from '../data/types'

export type ReadinessMode = 'normal' | 'reduced' | 'push'

export type ReadinessInput = {
  sleep: number     // hours
  sore: number      // 1–4
  energy: number    // 1–4
}

export function computeMode(r: ReadinessInput): ReadinessMode {
  if (r.sleep < 6 || r.sore >= 4 || r.energy <= 2) return 'reduced'
  if (r.sleep >= 7.5 && r.energy >= 4 && r.sore <= 2) return 'push'
  return 'normal'
}

/**
 * Apply mode to today's prescription:
 *  - reduced: drop last set per exercise; add +1 RIR.
 *  - push: add 1 set to the FIRST compound only.
 *  - normal: pass through.
 */
export function applyMode(
  exercises: ExerciseRow[],
  mode: ReadinessMode,
): ExerciseRow[] {
  if (mode === 'normal') return exercises.map((e) => ({ ...e }))

  if (mode === 'reduced') {
    return exercises.map((e) => ({
      ...e,
      sets: Math.max(1, e.sets - 1),
      rir: e.rir + 1,
    }))
  }

  // push
  let pushedFirstCompound = false
  return exercises.map((e) => {
    if (!pushedFirstCompound && e.type === 'compound') {
      pushedFirstCompound = true
      return { ...e, sets: e.sets + 1 }
    }
    return { ...e }
  })
}

export function modeCopy(mode: ReadinessMode): string {
  if (mode === 'reduced') return 'REDUCED — drop the last set, +1 RIR.'
  if (mode === 'push') return 'PUSH — extra set on first compound. Move.'
  return 'NORMAL — execute the plan.'
}
