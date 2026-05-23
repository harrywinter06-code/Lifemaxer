import { describe, it, expect } from 'vitest'
import { progressionAdvice, round25 } from './progression'
import type { ExerciseRow } from '../data/types'

const ex: ExerciseRow = {
  exId: 'pa-mcp', name: 'Machine Chest Press',
  type: 'compound', sets: 3, lo: 8, hi: 10, rir: 2,
}

describe('progression engine', () => {
  it('returns fresh when no history', () => {
    const a = progressionAdvice(ex, null)
    expect(a.kind).toBe('fresh')
  })

  it('returns fresh on empty sets', () => {
    expect(progressionAdvice(ex, []).kind).toBe('fresh')
  })

  it('adds load when every set hit the top of the range', () => {
    const a = progressionAdvice(ex, [
      { w: 50, r: 10 },
      { w: 50, r: 10 },
      { w: 50, r: 10 },
    ])
    expect(a.kind).toBe('add-load')
    if (a.kind === 'add-load') {
      expect(a.suggestedWeight).toBe(52.5)
      expect(a.repTarget).toBe(8)
    }
  })

  it('keeps load and asks to beat reps when below top', () => {
    const a = progressionAdvice(ex, [
      { w: 50, r: 10 },
      { w: 50, r: 9 },
      { w: 50, r: 8 },
    ])
    expect(a.kind).toBe('beat-reps')
    if (a.kind === 'beat-reps') expect(a.suggestedWeight).toBe(50)
  })

  it('rounds to nearest 2.5 kg', () => {
    expect(round25(51.2)).toBe(50)     // 51.2 closer to 50 than 52.5
    expect(round25(51.3)).toBe(52.5)   // 51.3 closer to 52.5
    expect(round25(53.75)).toBe(55)
    expect(round25(0)).toBe(0)
  })

  it('does not add load if even one set fell short', () => {
    const a = progressionAdvice(ex, [
      { w: 50, r: 10 },
      { w: 50, r: 10 },
      { w: 50, r: 9 },
    ])
    expect(a.kind).toBe('beat-reps')
  })
})
