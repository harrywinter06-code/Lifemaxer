import Dexie, { type Table } from 'dexie'
import type {
  Profile,
  WorkoutSession,
  BodyweightEntry,
  NutritionDay,
  Readiness,
  PainEntry,
  Checklist,
  Swap,
  MealSwap,
  GroceryState,
  ChatMsg,
} from './types'

export class DrillDB extends Dexie {
  profile!: Table<Profile, number>
  sessions!: Table<WorkoutSession, number>
  bodyweight!: Table<BodyweightEntry, string>
  nutrition!: Table<NutritionDay, string>
  readiness!: Table<Readiness, string>
  pain!: Table<PainEntry, string>
  checklist!: Table<Checklist, string>
  swaps!: Table<Swap, string>
  mealSwaps!: Table<MealSwap, string>
  groceries!: Table<GroceryState, string>
  chat!: Table<ChatMsg, number>

  constructor() {
    super('drill')
    this.version(1).stores({
      profile: 'id',
      sessions: '++id, date, dayId',
      bodyweight: 'date',
      nutrition: 'date',
      readiness: 'date',
      pain: 'date',
      checklist: 'date',
      swaps: 'exId',
      mealSwaps: 'mealId',
      groceries: 'item',
      chat: '++id, ts',
    })
  }
}

export const db = new DrillDB()
