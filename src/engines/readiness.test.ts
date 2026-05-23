import { describe, it, expect } from 'vitest'
import { computeMode, applyMode } from './readiness'
import type { ExerciseRow } from '../data/types'

const compound = (sets = 3, rir = 2): ExerciseRow => ({
  exId: 'c', name: 'C', type: 'compound', sets, lo: 8, hi: 10, rir,
})
const iso = (sets = 3, rir = 1): ExerciseRow => ({
  exId: 'i', name: 'I', type: 'iso', sets, lo: 12, hi: 15, rir,
})

describe('computeMode', () => {
  it('reduced when sleep < 6', () => {
    expect(computeMode({ sleep: 5, sore: 1, energy: 4 })).toBe('reduced')
  })
  it('reduced when soreness >= 4', () => {
    expect(computeMode({ sleep: 8, sore: 4, energy: 3 })).toBe('reduced')
  })
  it('reduced when energy <= 2', () => {
    expect(computeMode({ sleep: 8, sore: 1, energy: 2 })).toBe('reduced')
  })
  it('push when sleep >=7.5 AND energy >=4 AND sore <=2', () => {
    expect(computeMode({ sleep: 7.5, sore: 2, energy: 4 })).toBe('push')
    expect(computeMode({ sleep: 9, sore: 1, energy: 4 })).toBe('push')
  })
  it('normal otherwise', () => {
    expect(computeMode({ sleep: 7, sore: 3, energy: 3 })).toBe('normal')
  })
})

describe('applyMode', () => {
  it('normal passes through', () => {
    const out = applyMode([compound(3, 2), iso(3, 1)], 'normal')
    expect(out[0].sets).toBe(3)
    expect(out[0].rir).toBe(2)
  })

  it('reduced drops 1 set and +1 RIR per exercise', () => {
    const out = applyMode([compound(3, 2), iso(3, 1)], 'reduced')
    expect(out[0].sets).toBe(2)
    expect(out[0].rir).toBe(3)
    expect(out[1].sets).toBe(2)
    expect(out[1].rir).toBe(2)
  })

  it('reduced floors set count at 1', () => {
    const out = applyMode([compound(1, 1)], 'reduced')
    expect(out[0].sets).toBe(1)
  })

  it('push adds 1 set to the FIRST compound only', () => {
    const out = applyMode([iso(3, 1), compound(3, 2), compound(3, 2)], 'push')
    expect(out[0].sets).toBe(3)
    expect(out[1].sets).toBe(4)
    expect(out[2].sets).toBe(3)
  })

  it('push without any compounds is a no-op', () => {
    const out = applyMode([iso(3, 1), iso(3, 1)], 'push')
    expect(out.map((e) => e.sets)).toEqual([3, 3])
  })
})
