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
  return next
}

// ---------- sessions ----------

export async function addSession(s: Omit<WorkoutSession, 'id'>): Promise<number> {
  return (await db.sessions.add(s as WorkoutSession)) as number
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
  return next
}

export async function setNutrition(n: NutritionDay): Promise<void> {
  await db.nutrition.put(n)
}

// ---------- readiness ----------

export async function getReadiness(date: string = todayISO()): Promise<Readiness | undefined> {
  return db.readiness.get(date)
}

export async function putReadiness(r: Readiness): Promise<void> {
  await db.readiness.put(r)
}

// ---------- pain ----------

export async function putPain(p: PainEntry): Promise<void> {
  await db.pain.put(p)
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
}

export async function patchChecklist(
  patch: Partial<Omit<Checklist, 'date'>>,
  date: string = todayISO(),
): Promise<Checklist> {
  const cur = await getChecklist(date)
  const next = { ...cur, ...patch }
  await db.checklist.put(next)
  return next
}

// ---------- swaps ----------

export async function getSwap(exId: string): Promise<Swap | undefined> {
  return db.swaps.get(exId)
}

export async function setSwap(s: Swap): Promise<void> {
  await db.swaps.put(s)
}

export async function clearSwap(exId: string): Promise<void> {
  await db.swaps.delete(exId)
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
}

export async function clearMealSwap(mealId: string): Promise<void> {
  await db.mealSwaps.delete(mealId)
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
}

export async function resetGroceries(): Promise<void> {
  await db.groceries.clear()
}

export async function listGroceries(): Promise<GroceryState[]> {
  return db.groceries.toArray()
}

// ---------- chat ----------

export async function addChat(m: Omit<ChatMsg, 'id'>): Promise<number> {
  return (await db.chat.add(m as ChatMsg)) as number
}

export async function listChat(): Promise<ChatMsg[]> {
  return db.chat.orderBy('ts').toArray()
}

export async function clearChat(): Promise<void> {
  await db.chat.clear()
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
