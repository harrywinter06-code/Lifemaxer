// Engine G helpers — bedtime tap. SPEC §7G + bedtime detection decision.
//
// "LIGHTS OUT" tap counts as on-time IF tapped ≤ bed + 15 min.
// (Tapping after that still records sleep=true for the day but does NOT
//  increment the streak.)

import { nowMinutes, timeToMinutes } from '../lib/date'

const GRACE_MIN = 15

export type BedtimeResult = {
  onTime: boolean
  delta: number   // signed minutes from bedtime (negative = early)
}

export function evaluateBedtime(bedHHMM: string, now = new Date()): BedtimeResult {
  const bed = timeToMinutes(bedHHMM)
  const cur = nowMinutes(now)
  // Allow tapping before bed (already winding down) up to 30 min early as still on-time.
  const earlyBound = bed - 30
  const lateBound = bed + GRACE_MIN

  if (cur >= earlyBound && cur <= lateBound) {
    return { onTime: true, delta: cur - bed }
  }
  // Wrap (cur near midnight, bed=23:00): allow up to lateBound after midnight wrap.
  if (cur < 6 * 60) {
    return { onTime: false, delta: cur + 24 * 60 - bed }
  }
  return { onTime: false, delta: cur - bed }
}

/** Should the 22:50 wind-down nag fire? (10 min before bed, until bedtime). */
export function shouldNagBedtime(bedHHMM: string, now = new Date()): boolean {
  const bed = timeToMinutes(bedHHMM)
  const cur = nowMinutes(now)
  return cur >= bed - 10 && cur < bed
}
