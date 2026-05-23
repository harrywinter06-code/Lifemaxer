// Client wrapper for the /api/coach Edge function + JSON action parsing.

import { PROGRAM } from '../data/program'
import { MEALS } from '../data/meals'
import {
  getProfile,
  listSwaps,
  listMealSwaps,
  recentSessions,
  getNutrition,
} from '../db/repo'

export type CoachAction =
  | { action: 'swap_exercise'; exId: string; newName: string }
  | {
      action: 'swap_meal'
      mealId: string
      name: string
      items: string[]
      kcal: number
      protein: number
      fat: number
      carbs: number
    }

export type CoachResponse = {
  role: 'assistant'
  content: string
  configMissing?: boolean
  error?: string
}

export async function callCoach(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<CoachResponse> {
  const [profile, swaps, mealSwaps, sessions, todaysNutrition] = await Promise.all([
    getProfile(),
    listSwaps(),
    listMealSwaps(),
    recentSessions(3),
    getNutrition(),
  ])

  const context = {
    profile: {
      bodyweightKg: profile.bodyweightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      schedule: profile.schedule,
      targets: profile.targets,
      programDay: profile.programDay,
      weekNum: profile.weekNum,
    },
    program: PROGRAM.map((d) => ({
      dayId: d.dayId,
      label: d.label,
      exercises: d.exercises.map((e) => ({ exId: e.exId, name: e.name, sets: e.sets, lo: e.lo, hi: e.hi })),
    })),
    swaps,
    mealSwaps,
    meals: MEALS.map((m) => ({ mealId: m.mealId, name: m.name })),
    recentSessions: sessions.map((s) => ({
      date: s.date,
      dayId: s.dayId,
      mode: s.mode,
      topByExercise: s.exercises.map((e) => ({
        exId: e.exId,
        topW: Math.max(0, ...e.sets.map((x) => x.w)),
        sets: e.sets.length,
      })),
    })),
    todaysNutrition,
  }

  let resp: Response
  try {
    resp = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    })
  } catch (e) {
    return {
      role: 'assistant',
      content: '',
      error: `Network: ${String(e)}`,
    }
  }

  if (resp.status === 503) {
    const body = (await safeJson(resp)) as { error?: string }
    return {
      role: 'assistant',
      content: '',
      configMissing: true,
      error: body?.error ?? 'API key not set',
    }
  }

  if (!resp.ok) {
    const body = (await safeJson(resp)) as { error?: string }
    return {
      role: 'assistant',
      content: '',
      error: body?.error ?? `HTTP ${resp.status}`,
    }
  }

  const data = (await safeJson(resp)) as { content?: string }
  return {
    role: 'assistant',
    content: data?.content ?? '',
  }
}

async function safeJson(r: Response): Promise<unknown> {
  try {
    return await r.json()
  } catch {
    return null
  }
}

/** Extract one or more proposed action JSON blocks from an assistant message. */
export function parseActions(content: string): CoachAction[] {
  const out: CoachAction[] = []
  const re = /```json\s*([\s\S]*?)```/gi
  for (const m of content.matchAll(re)) {
    try {
      const obj = JSON.parse(m[1].trim())
      if (isAction(obj)) out.push(obj)
    } catch {
      // ignore malformed
    }
  }
  return out
}

function isAction(v: unknown): v is CoachAction {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (o.action === 'swap_exercise') {
    return typeof o.exId === 'string' && typeof o.newName === 'string'
  }
  if (o.action === 'swap_meal') {
    return (
      typeof o.mealId === 'string' &&
      typeof o.name === 'string' &&
      Array.isArray(o.items) &&
      typeof o.kcal === 'number' &&
      typeof o.protein === 'number'
    )
  }
  return false
}

/** Display string for a parsed action. */
export function describeAction(a: CoachAction): string {
  if (a.action === 'swap_exercise') {
    return `Swap exercise ${a.exId} → ${a.newName}`
  }
  return `Swap ${a.mealId} → ${a.name} (${a.kcal} kcal · ${a.protein}g P)`
}
