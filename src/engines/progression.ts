// Engine A — per-exercise double progression. SPEC §7A.

import type { ExerciseRow } from '../data/types'
import type { LoggedSet } from '../db/types'

export type ProgressionAdvice =
  | {
      kind: 'fresh'
      headline: string
      sub: string
    }
  | {
      kind: 'add-load'
      headline: string
      sub: string
      suggestedWeight: number
      repTarget: number       // bottom of range
    }
  | {
      kind: 'beat-reps'
      headline: string
      sub: string
      suggestedWeight: number
      lastReps: number[]      // per-set reps last time
    }

/** Build the suggestion for this exercise based on last logged sets. */
export function progressionAdvice(
  ex: ExerciseRow,
  lastSets: LoggedSet[] | null,
): ProgressionAdvice {
  if (!lastSets || lastSets.length === 0) {
    return {
      kind: 'fresh',
      headline: 'NEW LIFT. PICK A CONTROLLED WEIGHT.',
      sub: `${ex.lo}–${ex.hi} reps · RIR ${ex.rir}.`,
    }
  }

  const top = ex.hi
  const allHitTop = lastSets.every((s) => s.r >= top)
  const lastWeight = lastSets[0].w

  if (allHitTop) {
    const suggestedWeight = round25(lastWeight + 2.5)
    return {
      kind: 'add-load',
      headline: `SMASHED IT. +2.5KG → ${suggestedWeight}KG.`,
      sub: `Aim ${ex.lo}. RIR ${ex.rir}.`,
      suggestedWeight,
      repTarget: ex.lo,
    }
  }

  return {
    kind: 'beat-reps',
    headline: `${lastWeight}KG. BEAT LAST.`,
    sub: `Last: ${lastSets.map((s) => s.r).join('·')}. RIR ${ex.rir}.`,
    suggestedWeight: lastWeight,
    lastReps: lastSets.map((s) => s.r),
  }
}

/** Round to nearest 2.5 kg (most plate sets); avoid fractional weights. */
export function round25(kg: number): number {
  return Math.round(kg / 2.5) * 2.5
}
