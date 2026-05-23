import { todayISO } from '../lib/date'
import { DEFAULT_TARGETS } from './meals'
import type { Targets } from './types'

// SPEC §1 — used as the *starting* values for the onboarding wizard.
// User can adjust everything before completing the wizard.
export type Profile = {
  id: 1
  bodyweightKg: number
  heightCm: number
  age: number
  targets: Targets
  schedule: { wake: string; train: string; bed: string }
  startDate: string
  bedStreak: number
  programDay: number   // index into PROGRAM[], advances on session completion
  weekNum: number      // mesocycle week (1-based)
  tone: 'drill'
  onboarded: boolean
  lastDeloadDay: number  // programDay when the last deload finished; 0 = never
}

export const DEFAULT_PROFILE: Profile = {
  id: 1,
  bodyweightKg: 65,
  heightCm: 188,
  age: 18,
  targets: { ...DEFAULT_TARGETS },
  schedule: { wake: '08:00', train: '10:00', bed: '23:00' },
  startDate: todayISO(),
  bedStreak: 0,
  programDay: 0,
  weekNum: 1,
  tone: 'drill',
  onboarded: false,
  lastDeloadDay: 0,
}
