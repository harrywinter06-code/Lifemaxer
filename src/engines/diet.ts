// Engine E — diet auto-adjust from bodyweight trend. SPEC §7E.

import type { BodyweightEntry } from '../db/types'

export type DietNudge = {
  kgPerWeek: number | null   // null if not enough data
  suggestion: 'hold' | 'increase' | 'decrease'
  kcalDelta: number          // 0 / +250 / -150
  message: string
}

/**
 * Rolling average of last `window` weigh-ins, kg/week.
 * SPEC §7E thresholds:
 *  < 0.2 kg/wk → +250 kcal
 *  > 0.6 kg/wk → -150 kcal
 *  else hold.
 */
export function dietNudge(
  entries: BodyweightEntry[],
  window = 7,
): DietNudge {
  if (entries.length < 3) {
    return {
      kgPerWeek: null,
      suggestion: 'hold',
      kcalDelta: 0,
      message: 'NEED MORE WEIGH-INS. ON THE SCALE DAILY.',
    }
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const tail = sorted.slice(-window)
  if (tail.length < 2) {
    return {
      kgPerWeek: null,
      suggestion: 'hold',
      kcalDelta: 0,
      message: 'NEED MORE WEIGH-INS.',
    }
  }

  const first = tail[0]
  const last = tail[tail.length - 1]
  const days = daysBetweenISO(first.date, last.date)
  if (days <= 0) {
    return {
      kgPerWeek: null,
      suggestion: 'hold',
      kcalDelta: 0,
      message: 'WEIGH IN ON DIFFERENT DAYS.',
    }
  }

  const kgPerWeek = ((last.kg - first.kg) / days) * 7

  if (kgPerWeek < 0.2) {
    return {
      kgPerWeek,
      suggestion: 'increase',
      kcalDelta: 250,
      message: 'TOO SLOW. EAT 250 MORE.',
    }
  }
  if (kgPerWeek > 0.6) {
    return {
      kgPerWeek,
      suggestion: 'decrease',
      kcalDelta: -150,
      message: 'TOO FAST = FAT. CUT 150.',
    }
  }
  return {
    kgPerWeek,
    suggestion: 'hold',
    kcalDelta: 0,
    message: 'DIALLED IN. HOLD.',
  }
}

function daysBetweenISO(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}
