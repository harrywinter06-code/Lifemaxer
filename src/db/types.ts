// Persisted entity types — match SPEC §9.

import type { Targets } from '../data/types'

export type Profile = {
  id: 1
  bodyweightKg: number
  heightCm: number
  age: number
  targets: Targets
  schedule: { wake: string; train: string; bed: string }
  startDate: string
  bedStreak: number
  programDay: number
  weekNum: number
  tone: 'drill'
  onboarded: boolean
  lastDeloadDay: number
}

export type LoggedSet = { w: number; r: number }

export type WorkoutSession = {
  id?: number
  date: string                // YYYY-MM-DD
  dayId: string
  mode: 'normal' | 'reduced' | 'push'
  exercises: {
    exId: string
    name: string
    sets: LoggedSet[]
  }[]
}

export type BodyweightEntry = { date: string; kg: number }

export type NutritionDay = {
  date: string
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export type Readiness = {
  date: string
  sleep: number               // hours
  sore: number                // 1–4
  energy: number              // 1–4
  mode: 'normal' | 'reduced' | 'push'
}

export type PainEntry = {
  date: string
  shoulder: number            // 0–10
  knee: number                // 0–10
}

export type Checklist = {
  date: string
  train: boolean
  protein: boolean
  calories: boolean
  prehab: boolean
  sleep: boolean              // lights-out-on-time
}

export type Swap = { exId: string; newName: string }
export type MealSwap = {
  mealId: string
  name: string
  items: string[]
  kcal: number
  protein: number
  fat: number
  carbs: number
}
export type GroceryState = { item: string; checked: boolean }
export type ChatMsg = {
  id?: number
  role: 'user' | 'assistant'
  content: string
  ts: number
}
