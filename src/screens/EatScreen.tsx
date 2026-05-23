import { useEffect, useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { Screen } from '../components/Screen'
import { MacroBar } from '../components/MacroBar'
import {
  Check,
  Flame,
  ListChecks,
  Plus,
  ShoppingCart,
} from '../components/Icon'
import { MEALS } from '../data/meals'
import { GROCERIES } from '../data/groceries'
import {
  addNutrition,
  getNutrition,
  getProfile,
  listGroceries,
  listMealSwaps,
  patchChecklist,
  setGrocery,
  setNutrition,
} from '../db/repo'
import type { MealSwap, NutritionDay } from '../db/types'
import type { Meal, Targets } from '../data/types'
import { todayISO } from '../lib/date'

type SubTab = 'plan' | 'groceries'

export function EatScreen() {
  const [tab, setTab] = useState<SubTab>('plan')
  const [targets, setTargets] = useState<Targets | null>(null)
  const [nutrition, setNutritionState] = useState<NutritionDay | null>(null)
  const [groceryChecked, setGroceryChecked] = useState<Record<string, boolean>>({})
  const [mealSwaps, setMealSwaps] = useState<MealSwap[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [profile, n, groceries, swaps] = await Promise.all([
        getProfile(),
        getNutrition(),
        listGroceries(),
        listMealSwaps(),
      ])
      if (cancelled) return
      setTargets(profile.targets)
      setNutritionState(n)
      setGroceryChecked(
        Object.fromEntries(groceries.map((g) => [g.item, g.checked])),
      )
      setMealSwaps(swaps)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const mealsForDisplay: Meal[] = useMemo(() => {
    return MEALS.map((m) => {
      const swap = mealSwaps.find((s) => s.mealId === m.mealId)
      if (!swap) return m
      return {
        ...m,
        name: swap.name,
        items: swap.items,
        kcal: swap.kcal,
        protein: swap.protein,
        fat: swap.fat,
        carbs: swap.carbs,
      }
    })
  }, [mealSwaps])

  const persistAndSync = async (next: NutritionDay) => {
    await setNutrition(next)
    setNutritionState(next)
    if (targets) {
      await patchChecklist({
        protein: next.protein >= targets.protein * 0.95,
        calories: next.kcal >= targets.kcal * 0.95,
      })
    }
  }

  const logMeal = async (m: Meal) => {
    if (!nutrition) return
    const next: NutritionDay = {
      date: nutrition.date,
      kcal: nutrition.kcal + m.kcal,
      protein: nutrition.protein + m.protein,
      fat: nutrition.fat + m.fat,
      carbs: nutrition.carbs + m.carbs,
    }
    await persistAndSync(next)
  }

  const quickAdjust = async (
    delta: Partial<Omit<NutritionDay, 'date'>>,
  ) => {
    if (!nutrition) return
    const next: NutritionDay = {
      date: nutrition.date,
      kcal: Math.max(0, nutrition.kcal + (delta.kcal ?? 0)),
      protein: Math.max(0, nutrition.protein + (delta.protein ?? 0)),
      fat: Math.max(0, nutrition.fat + (delta.fat ?? 0)),
      carbs: Math.max(0, nutrition.carbs + (delta.carbs ?? 0)),
    }
    await persistAndSync(next)
  }

  const resetToday = async () => {
    if (!confirm('Reset today\'s nutrition to zero?')) return
    await addNutrition({ kcal: 0, protein: 0, fat: 0, carbs: 0 }) // ensures row exists
    const cleared: NutritionDay = {
      date: todayISO(), kcal: 0, protein: 0, fat: 0, carbs: 0,
    }
    await persistAndSync(cleared)
  }

  const toggleGrocery = async (item: string) => {
    const checked = !groceryChecked[item]
    await setGrocery({ item, checked })
    setGroceryChecked((cur) => ({ ...cur, [item]: checked }))
  }

  if (!targets || !nutrition) {
    return (
      <Screen>
        <Header title="EAT" subtitle="Loading…" />
      </Screen>
    )
  }

  const kcalLeft = Math.max(0, targets.kcal - nutrition.kcal)
  const proteinLeft = Math.max(0, targets.protein - nutrition.protein)

  return (
    <Screen>
      <Header title="EAT" subtitle={`Target ${targets.kcal} kcal · ${targets.protein}g P`} />

      {/* macro panel */}
      <section className="panel-pad space-y-3">
        <MacroBar label="PROTEIN" current={nutrition.protein} target={targets.protein} />
        <MacroBar label="CALORIES" current={nutrition.kcal} target={targets.kcal} unit="" />
        <MacroBar label="CARBS" current={nutrition.carbs} target={targets.carbs} accent="text-dim" fill="bg-dim" />
        <MacroBar label="FAT" current={nutrition.fat} target={targets.fat} accent="text-dim" fill="bg-dim" />
        <div className="flex items-center justify-between pt-1 border-t border-line">
          <div className="flex items-center gap-2 text-warn">
            <Flame size={16} />
            <span className="shout text-xs">{kcalLeft} KCAL LEFT</span>
          </div>
          <div className="text-dim text-xs num">{proteinLeft}g P left</div>
        </div>
      </section>

      {/* quick adjust chips */}
      <section className="flex flex-wrap gap-2">
        <button onClick={() => quickAdjust({ kcal: 250 })} className="chip">+250 kcal</button>
        <button onClick={() => quickAdjust({ kcal: 500 })} className="chip">+500 kcal</button>
        <button onClick={() => quickAdjust({ protein: 20 })} className="chip">+20g P</button>
        <button onClick={() => quickAdjust({ protein: 40 })} className="chip">+40g P</button>
        <button onClick={() => quickAdjust({ kcal: -200 })} className="chip">−200 kcal</button>
        <button onClick={resetToday} className="chip">RESET</button>
      </section>

      {/* sub-tabs */}
      <div className="flex gap-2 border-b border-line">
        <SubTabButton active={tab === 'plan'} onClick={() => setTab('plan')} icon={<ListChecks size={16} />}>
          MEAL PLAN
        </SubTabButton>
        <SubTabButton active={tab === 'groceries'} onClick={() => setTab('groceries')} icon={<ShoppingCart size={16} />}>
          GROCERIES
        </SubTabButton>
      </div>

      {tab === 'plan' && (
        <section className="space-y-3">
          {mealsForDisplay.map((m) => (
            <article key={m.mealId} className="panel-pad space-y-2">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs shout text-dim">{m.slot.toUpperCase()}</div>
                  <h3 className="shout text-lg leading-tight">{m.name}</h3>
                </div>
                {m.packed && (
                  <span className="chip-warn">PACK NIGHT BEFORE</span>
                )}
              </header>
              <ul className="text-sm text-text/80 space-y-0.5">
                {m.items.map((it, i) => <li key={i}>• {it}</li>)}
              </ul>
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs num text-dim">
                  {m.kcal} kcal · {m.protein}g P · {m.carbs}g C · {m.fat}g F
                </div>
                <button onClick={() => logMeal(m)} className="btn-volt flex items-center gap-1 px-3 py-2 text-xs">
                  <Plus size={14} /> LOG
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'groceries' && (
        <section className="panel-pad">
          <ul className="space-y-1">
            {GROCERIES.map((g) => {
              const checked = !!groceryChecked[g.item]
              return (
                <li key={g.item}>
                  <button
                    onClick={() => toggleGrocery(g.item)}
                    className="w-full flex items-center justify-between p-2 rounded-md active:bg-panel2 transition"
                  >
                    <span className={`flex items-center gap-3 ${checked ? 'text-dim line-through' : 'text-text'}`}>
                      <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                        checked ? 'bg-volt border-volt text-bg' : 'border-line text-transparent'
                      }`}>
                        <Check size={14} strokeWidth={3} />
                      </span>
                      {g.item}
                    </span>
                    <span className="text-xs text-dim num">{g.qty}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </Screen>
  )
}

function SubTabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shout text-xs py-3 px-3 flex items-center gap-2 border-b-2 ${
        active ? 'border-volt text-volt' : 'border-transparent text-dim'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
