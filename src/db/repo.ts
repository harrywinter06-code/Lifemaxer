import { db } from './db'
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
import { DEFAULT_PROFILE } from '../data/seed'
import { todayISO } from '../lib/date'
import { notifyWrite } from '../lib/syncBus'

// ---------- profile ----------

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get(1)
  if (p) return p
  await db.profile.put(DEFAULT_PROFILE)
  return DEFAULT_PROFILE
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const cur = await getProfile()
  const next: Profile = { ...cur, ...patch, id: 1 }
  await db.profile.put(next)
  notifyWrite()
  return next
}

// ---------- sessions ----------

export async function addSession(s: Omit<WorkoutSession, 'id'>): Promise<number> {
  const id = (await db.sessions.add(s as WorkoutSession)) as number
  notifyWrite()
  return id
}

export async function listSessions(): Promise<WorkoutSession[]> {
  return db.sessions.orderBy('date').toArray()
}

export async function recentSessions(limit = 20): Promise<WorkoutSession[]> {
  const all = await db.sessions.orderBy('date').reverse().toArray()
  return all.slice(0, limit)
}

export async function lastSessionForExercise(
  exId: string,
): Promise<{ session: WorkoutSession; sets: { w: number; r: number }[] } | null> {
  const all = await db.sessions.orderBy('date').reverse().toArray()
  for (const s of all) {
    const hit = s.exercises.find((e) => e.exId === exId)
    if (hit && hit.sets.length > 0) return { session: s, sets: hit.sets }
  }
  return null
}

// ---------- bodyweight ----------

export async function putBodyweight(date: string, kg: number): Promise<void> {
  await db.bodyweight.put({ date, kg })
  notifyWrite()
}

export async function listBodyweight(): Promise<BodyweightEntry[]> {
  return db.bodyweight.orderBy('date').toArray()
}

// ---------- nutrition ----------

export async function getNutrition(date: string = todayISO()): Promise<NutritionDay> {
  return (
    (await db.nutrition.get(date)) ?? {
      date,
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    }
  )
}

export async function addNutrition(
  delta: Omit<NutritionDay, 'date'>,
  date: string = todayISO(),
): Promise<NutritionDay> {
  const cur = await getNutrition(date)
  const next: NutritionDay = {
    date,
    kcal: cur.kcal + delta.kcal,
    protein: cur.protein + delta.protein,
    fat: cur.fat + delta.fat,
    carbs: cur.carbs + delta.carbs,
  }
  await db.nutrition.put(next)
  notifyWrite()
  return next
}

export async function setNutrition(n: NutritionDay): Promise<void> {
  await db.nutrition.put(n)
  notifyWrite()
}

// ---------- readiness ----------

export async function getReadiness(date: string = todayISO()): Promise<Readiness | undefined> {
  return db.readiness.get(date)
}

export async function putReadiness(r: Readiness): Promise<void> {
  await db.readiness.put(r)
  notifyWrite()
}

// ---------- pain ----------

export async function putPain(p: PainEntry): Promise<void> {
  await db.pain.put(p)
  notifyWrite()
}

export async function listPain(): Promise<PainEntry[]> {
  return db.pain.orderBy('date').toArray()
}

// ---------- checklist ----------

export async function getChecklist(date: string = todayISO()): Promise<Checklist> {
  return (
    (await db.checklist.get(date)) ?? {
      date,
      train: false,
      protein: false,
      calories: false,
      prehab: false,
      sleep: false,
    }
  )
}

export async function setChecklist(c: Checklist): Promise<void> {
  await db.checklist.put(c)
  notifyWrite()
}

export async function patchChecklist(
  patch: Partial<Omit<Checklist, 'date'>>,
  date: string = todayISO(),
): Promise<Checklist> {
  const cur = await getChecklist(date)
  const next = { ...cur, ...patch }
  await db.checklist.put(next)
  notifyWrite()
  return next
}

// ---------- swaps ----------

export async function getSwap(exId: string): Promise<Swap | undefined> {
  return db.swaps.get(exId)
}

export async function setSwap(s: Swap): Promise<void> {
  await db.swaps.put(s)
  notifyWrite()
}

export async function clearSwap(exId: string): Promise<void> {
  await db.swaps.delete(exId)
  notifyWrite()
}

export async function listSwaps(): Promise<Swap[]> {
  return db.swaps.toArray()
}

// ---------- meal swaps ----------

export async function getMealSwap(mealId: string): Promise<MealSwap | undefined> {
  return db.mealSwaps.get(mealId)
}

export async function setMealSwap(m: MealSwap): Promise<void> {
  await db.mealSwaps.put(m)
  notifyWrite()
}

export async function clearMealSwap(mealId: string): Promise<void> {
  await db.mealSwaps.delete(mealId)
  notifyWrite()
}

export async function listMealSwaps(): Promise<MealSwap[]> {
  return db.mealSwaps.toArray()
}

// ---------- groceries ----------

export async function getGrocery(item: string): Promise<GroceryState | undefined> {
  return db.groceries.get(item)
}

export async function setGrocery(g: GroceryState): Promise<void> {
  await db.groceries.put(g)
  notifyWrite()
}

export async function resetGroceries(): Promise<void> {
  await db.groceries.clear()
  notifyWrite()
}

export async function listGroceries(): Promise<GroceryState[]> {
  return db.groceries.toArray()
}

// ---------- chat ----------

export async function addChat(m: Omit<ChatMsg, 'id'>): Promise<number> {
  const id = (await db.chat.add(m as ChatMsg)) as number
  notifyWrite()
  return id
}

export async function listChat(): Promise<ChatMsg[]> {
  return db.chat.orderBy('ts').toArray()
}

export async function clearChat(): Promise<void> {
  await db.chat.clear()
  notifyWrite()
}

// ---------- export ----------

export async function exportAll(): Promise<Record<string, unknown>> {
  const [
    profile,
    sessions,
    bodyweight,
    nutrition,
    readiness,
    pain,
    checklist,
    swaps,
    mealSwaps,
    groceries,
    chat,
  ] = await Promise.all([
    db.profile.toArray(),
    db.sessions.toArray(),
    db.bodyweight.toArray(),
    db.nutrition.toArray(),
    db.readiness.toArray(),
    db.pain.toArray(),
    db.checklist.toArray(),
    db.swaps.toArray(),
    db.mealSwaps.toArray(),
    db.groceries.toArray(),
    db.chat.toArray(),
  ])
  return {
    exportedAt: new Date().toISOString(),
    profile,
    sessions,
    bodyweight,
    nutrition,
    readiness,
    pain,
    checklist,
    swaps,
    mealSwaps,
    groceries,
    chat,
  }
}

// ---------- import (cloud restore) ----------

type Snapshot = {
  profile?: Profile[]
  sessions?: WorkoutSession[]
  bodyweight?: BodyweightEntry[]
  nutrition?: NutritionDay[]
  readiness?: Readiness[]
  pain?: PainEntry[]
  checklist?: Checklist[]
  swaps?: Swap[]
  mealSwaps?: MealSwap[]
  groceries?: GroceryState[]
  chat?: ChatMsg[]
}

/** Replace local data with a snapshot (e.g. restored from cloud). */
export async function importAll(snap: Snapshot): Promise<void> {
  await db.transaction(
    'rw',
    [db.profile, db.sessions, db.bodyweight, db.nutrition, db.readiness,
     db.pain, db.checklist, db.swaps, db.mealSwaps, db.groceries, db.chat],
    async () => {
      if (snap.profile) {
        await db.profile.clear()
        if (snap.profile.length > 0) await db.profile.bulkPut(snap.profile)
      }
      if (snap.sessions) {
        await db.sessions.clear()
        // strip ids so Dexie reassigns; preserves chronological order via date.
        const sanitized = snap.sessions.map((s) => {
          const { id: _id, ...rest } = s
          void _id
          return rest as WorkoutSession
        })
        if (sanitized.length > 0) await db.sessions.bulkAdd(sanitized)
      }
      if (snap.bodyweight) { await db.bodyweight.clear(); if (snap.bodyweight.length) await db.bodyweight.bulkPut(snap.bodyweight) }
      if (snap.nutrition)  { await db.nutrition.clear();  if (snap.nutrition.length)  await db.nutrition.bulkPut(snap.nutrition) }
      if (snap.readiness)  { await db.readiness.clear();  if (snap.readiness.length)  await db.readiness.bulkPut(snap.readiness) }
      if (snap.pain)       { await db.pain.clear();       if (snap.pain.length)       await db.pain.bulkPut(snap.pain) }
      if (snap.checklist)  { await db.checklist.clear();  if (snap.checklist.length)  await db.checklist.bulkPut(snap.checklist) }
      if (snap.swaps)      { await db.swaps.clear();      if (snap.swaps.length)      await db.swaps.bulkPut(snap.swaps) }
      if (snap.mealSwaps)  { await db.mealSwaps.clear();  if (snap.mealSwaps.length)  await db.mealSwaps.bulkPut(snap.mealSwaps) }
      if (snap.groceries)  { await db.groceries.clear();  if (snap.groceries.length)  await db.groceries.bulkPut(snap.groceries) }
      if (snap.chat)       {
        await db.chat.clear()
        if (snap.chat.length) {
          const sanitized = snap.chat.map((c) => {
            const { id: _id, ...rest } = c
            void _id
            return rest as ChatMsg
          })
          await db.chat.bulkAdd(sanitized)
        }
      }
    },
  )
  notifyWrite()
}
