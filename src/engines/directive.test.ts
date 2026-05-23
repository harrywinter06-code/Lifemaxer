import { describe, it, expect } from 'vitest'
import { directive } from './directive'
import { DEFAULT_PROFILE } from '../data/seed'
import type { Checklist, NutritionDay, Readiness, BodyweightEntry } from '../db/types'

const profile = { ...DEFAULT_PROFILE }
const emptyCal: NutritionDay = { date: '2026-05-23', kcal: 0, protein: 0, fat: 0, carbs: 0 }
const fullChecklist: Checklist = {
  date: '2026-05-23',
  train: true, protein: true, calories: true, prehab: true, sleep: false,
}
const emptyChecklist: Checklist = {
  date: '2026-05-23',
  train: false, protein: false, calories: false, prehab: false, sleep: false,
}
const okReadiness: Readiness = { date: '2026-05-23', sleep: 8, sore: 2, energy: 4, mode: 'push' }
const bw: BodyweightEntry = { date: '2026-05-23', kg: 65.2 }

function at(h: number, m = 0) {
  return new Date(2026, 4, 23, h, m, 0)
}

describe('directive priority', () => {
  it('past bedtime → LIGHTS OUT', () => {
    const d = directive({
      profile, now: at(23, 30), readiness: okReadiness,
      todaysBodyweight: bw, nutrition: emptyCal, checklist: fullChecklist,
    })
    expect(d.key).toBe('lights-out')
  })

  it('morning, no readiness → CHECK IN', () => {
    const d = directive({
      profile, now: at(8, 30), nutrition: emptyCal,
      checklist: emptyChecklist,
    })
    expect(d.key).toBe('check-in')
  })

  it('after check-in, no bodyweight → SCALE', () => {
    const d = directive({
      profile, now: at(8, 45), readiness: okReadiness, nutrition: emptyCal,
      checklist: emptyChecklist,
    })
    expect(d.key).toBe('scale')
  })

  it('before noon, weighed in, no protein eaten → PROTEIN', () => {
    const d = directive({
      profile, now: at(9, 0), readiness: okReadiness,
      todaysBodyweight: bw, nutrition: emptyCal, checklist: emptyChecklist,
    })
    expect(d.key).toBe('protein')
  })

  it('train window & not trained → TRAIN', () => {
    const d = directive({
      profile, now: at(10, 0), readiness: okReadiness,
      todaysBodyweight: bw,
      nutrition: { ...emptyCal, protein: 50 },
      checklist: emptyChecklist,
    })
    expect(d.key).toBe('train')
  })

  it('evening + calories short → FINISH-CAL', () => {
    const d = directive({
      profile, now: at(20, 0), readiness: okReadiness,
      todaysBodyweight: bw,
      nutrition: { ...emptyCal, kcal: 2000, protein: 150 },
      checklist: fullChecklist,
    })
    expect(d.key).toBe('finish-cal')
  })

  it('quiet midday after training → PREP order', () => {
    const d = directive({
      profile, now: at(14, 0), readiness: okReadiness,
      todaysBodyweight: bw,
      nutrition: { ...emptyCal, kcal: 2500, protein: 120 },
      checklist: fullChecklist,
    })
    expect(d.key).toBe('prep')
  })

  it('never references the scale number in copy', () => {
    const d = directive({
      profile, now: at(9, 0), readiness: okReadiness,
      todaysBodyweight: bw, nutrition: { ...emptyCal, protein: 100 },
      checklist: emptyChecklist,
    })
    expect(JSON.stringify(d)).not.toMatch(/65\.2|65\b/)
  })
})
