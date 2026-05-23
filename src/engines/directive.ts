// Engine F — drill-sergeant "Right Now" directive. SPEC §7F.
//
// Single command, time-aware. Priority order, top match wins:
//   1. past bedtime → LIGHTS OUT
//   2. no readiness check-in this morning → CHECK IN
//   3. no bodyweight today → ON THE SCALE
//   4. pre-noon & protein not started → EAT, 48G PROTEIN
//   5. within ±90 min of train time & not trained → TRAIN
//   6. evening & calories short → FINISH YOUR CALORIES
//   7. else → fuel/prep order
//
// HARD RULE: never reference the scale number or the body negatively.

import { nowMinutes, timeToMinutes } from '../lib/date'
import type { Profile, Checklist, NutritionDay, Readiness, BodyweightEntry } from '../db/types'

export type Directive = {
  key: 'lights-out' | 'check-in' | 'scale' | 'protein' | 'train' | 'finish-cal' | 'prep'
  headline: string
  sub: string
}

export type DirectiveCtx = {
  profile: Profile
  now: Date
  readiness?: Readiness
  todaysBodyweight?: BodyweightEntry
  nutrition: NutritionDay
  checklist: Checklist
}

const TRAIN_WINDOW_MIN = 90

export function directive(ctx: DirectiveCtx): Directive {
  const minutes = nowMinutes(ctx.now)
  const bed = timeToMinutes(ctx.profile.schedule.bed)
  const train = timeToMinutes(ctx.profile.schedule.train)

  // 1. past bedtime → LIGHTS OUT (covers 23:00→04:00)
  if (isPastBedtime(minutes, bed)) {
    return {
      key: 'lights-out',
      headline: 'LIGHTS OUT.',
      sub: 'Phone face-down. Tomorrow starts at lights-out tonight.',
    }
  }

  // 2. no readiness check-in yet (only mornings)
  if (!ctx.readiness && minutes < train) {
    return {
      key: 'check-in',
      headline: 'CHECK IN.',
      sub: 'Sleep, soreness, energy. Then you can move.',
    }
  }

  // 3. no bodyweight today
  if (!ctx.todaysBodyweight) {
    return {
      key: 'scale',
      headline: 'ON THE SCALE.',
      sub: 'Daily. No exceptions. The number is data.',
    }
  }

  // 4. pre-noon & protein not started
  if (minutes < 12 * 60 && ctx.nutrition.protein < 30) {
    return {
      key: 'protein',
      headline: 'EAT. 48G PROTEIN.',
      sub: 'Overnight oats + scoop whey. Make it disappear.',
    }
  }

  // 5. train window
  const within = Math.abs(minutes - train) <= TRAIN_WINDOW_MIN
  if (within && !ctx.checklist.train) {
    return {
      key: 'train',
      headline: 'TRAIN. NOW.',
      sub: 'Prehab first. No exceptions. No phones between sets.',
    }
  }

  // 6. evening + calories short
  const calsShort = ctx.profile.targets.kcal - ctx.nutrition.kcal
  if (minutes >= 18 * 60 && calsShort > 400) {
    return {
      key: 'finish-cal',
      headline: 'FINISH YOUR CALORIES.',
      sub: `${calsShort} kcal still on the table. Surplus or stagnate.`,
    }
  }

  // 7. fuel / prep order
  if (minutes < train) {
    return {
      key: 'prep',
      headline: 'FUEL. PACK YOUR LUNCH.',
      sub: 'Wrap + chicken + cheese + spinach. Two of them.',
    }
  }
  if (minutes < 18 * 60) {
    return {
      key: 'prep',
      headline: 'EAT THE AFTERNOON.',
      sub: 'Greek yogurt + granola + honey. Then back to it.',
    }
  }
  return {
    key: 'prep',
    headline: 'WIND DOWN. PREP TOMORROW.',
    sub: 'Overnight oats in the fridge. Lights out at 23:00.',
  }
}

/** Bedtime range covers 23:00 → ~04:00; allow short pre-window for the nag. */
function isPastBedtime(nowMin: number, bedMin: number): boolean {
  // If bed=23:00, "past bedtime" = [bed, bed+5h) wrapping past midnight.
  const wrappedEnd = (bedMin + 5 * 60) % (24 * 60)
  if (wrappedEnd > bedMin) {
    return nowMin >= bedMin && nowMin < wrappedEnd
  }
  return nowMin >= bedMin || nowMin < wrappedEnd
}
