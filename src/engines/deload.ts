// Engine D — deload countdown. SPEC §7D.
//
// Trigger a deload week when EITHER:
//  - weeks since start (or last deload) hits 6–8, OR
//  - the last 2 sessions stalled (no rep/load progress on the heaviest compound).
// During a deload: ~50% sets, lighter, all sets short of failure.

import type { Profile, WorkoutSession } from '../db/types'

export type DeloadStatus = {
  isDeload: boolean
  weeksUntilDeload: number    // 0 if already deloading or due
  reason: 'window' | 'stall' | 'none'
}

const DELOAD_WINDOW_WEEKS = 7   // mid of 6-8

export function deloadStatus(
  profile: Profile,
  recent: WorkoutSession[],
  now = new Date(),
): DeloadStatus {
  const weeksSinceLast = elapsedWeeks(profile, now)
  if (weeksSinceLast >= DELOAD_WINDOW_WEEKS) {
    return {
      isDeload: true,
      weeksUntilDeload: 0,
      reason: 'window',
    }
  }

  if (detectStall(recent)) {
    return {
      isDeload: true,
      weeksUntilDeload: 0,
      reason: 'stall',
    }
  }

  return {
    isDeload: false,
    weeksUntilDeload: Math.max(0, DELOAD_WINDOW_WEEKS - weeksSinceLast),
    reason: 'none',
  }
}

function elapsedWeeks(profile: Profile, now: Date): number {
  // Use startDate if we haven't deloaded yet, else (start + lastDeloadDay * 1.166 days/programDay).
  // Simpler/more honest: just count calendar weeks since startDate, minus an offset stored on the profile when we deload.
  // For v1, weeks since startDate. When user marks a deload complete, we bump startDate to now.
  const start = new Date(profile.startDate + 'T00:00:00')
  const ms = now.getTime() - start.getTime()
  return Math.floor(ms / (7 * 86400000))
}

/** Detect if the last two same-dayId sessions had no progress on the first compound. */
export function detectStall(sessions: WorkoutSession[]): boolean {
  if (sessions.length < 4) return false
  // Group by dayId, find pairs of most recent two sessions of the same dayId,
  // check first-compound (first exercise) total reps / top weight.
  const byDay = new Map<string, WorkoutSession[]>()
  // sessions assumed sorted desc by date
  for (const s of sessions) {
    const list = byDay.get(s.dayId) ?? []
    list.push(s)
    byDay.set(s.dayId, list)
  }
  // Need at least one day with 3 sessions to look at "last two" being stalled vs the one before.
  // SPEC says 2 consecutive sessions stalled — i.e. session N stalled vs N-1, AND N-1 stalled vs N-2.
  for (const [, list] of byDay) {
    if (list.length < 3) continue
    const [a, b, c] = list
    if (!progressed(b, a) && !progressed(c, b)) return true
  }
  return false
}

function progressed(prev: WorkoutSession, cur: WorkoutSession): boolean {
  const pEx = prev.exercises[0]
  const cEx = cur.exercises[0]
  if (!pEx || !cEx) return false
  const pTop = topWeight(pEx.sets)
  const cTop = topWeight(cEx.sets)
  if (cTop > pTop) return true
  if (cTop < pTop) return false
  // same top load — did total reps go up?
  const pReps = totalReps(pEx.sets)
  const cReps = totalReps(cEx.sets)
  return cReps > pReps
}

function topWeight(sets: { w: number; r: number }[]): number {
  return sets.reduce((m, s) => Math.max(m, s.w), 0)
}
function totalReps(sets: { w: number; r: number }[]): number {
  return sets.reduce((sum, s) => sum + s.r, 0)
}

/** Reduce a day's prescription to a deload (≈50% sets, every set well short of failure). */
export function deloadPrescription<E extends { sets: number; rir: number }>(
  exercises: E[],
): E[] {
  return exercises.map((e) => ({
    ...e,
    sets: Math.max(1, Math.floor(e.sets / 2)),
    rir: Math.max(4, e.rir + 3),
  }))
}
