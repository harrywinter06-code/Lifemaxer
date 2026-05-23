// Shared static types used by /data and /db.

export type DayId = 'push-a' | 'pull-a' | 'legs-a' | 'push-b' | 'pull-b' | 'legs-b'
export type PrehabKind = 'shoulder' | 'knee'

export type ExerciseRow = {
  exId: string        // stable id (slug, scoped to its day for clarity)
  name: string        // display name
  type: 'compound' | 'iso'
  sets: number        // base set count (before autoregulation)
  lo: number          // bottom of rep range
  hi: number          // top of rep range
  rir: number         // target reps-in-reserve
}

export type ProgramDay = {
  dayId: DayId
  label: string       // e.g. "PUSH A — CHEST"
  prehab: PrehabKind
  exercises: ExerciseRow[]
}

export type PrehabItem = {
  name: string
  detail: string      // e.g. "2×20"
}

export type Meal = {
  mealId: string
  slot: 'breakfast' | 'mid-morning' | 'lunch' | 'afternoon' | 'dinner' | 'pre-bed'
  name: string
  items: string[]
  kcal: number
  protein: number
  fat: number
  carbs: number
  packed: boolean     // pack the night before / portable
}

export type Grocery = {
  item: string
  qty: string
}

export type Targets = {
  kcal: number
  protein: number
  fat: number
  carbs: number
}
