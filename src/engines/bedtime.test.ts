import { describe, it, expect } from 'vitest'
import { evaluateBedtime, shouldNagBedtime } from './bedtime'

function at(h: number, m = 0) {
  return new Date(2026, 4, 23, h, m, 0)
}

describe('evaluateBedtime', () => {
  it('counts on-time at exactly bedtime', () => {
    expect(evaluateBedtime('23:00', at(23, 0)).onTime).toBe(true)
  })
  it('counts on-time at 22:35 (30 min early)', () => {
    expect(evaluateBedtime('23:00', at(22, 35)).onTime).toBe(true)
  })
  it('counts on-time at 23:15 (grace)', () => {
    expect(evaluateBedtime('23:00', at(23, 15)).onTime).toBe(true)
  })
  it('NOT on-time at 23:30', () => {
    expect(evaluateBedtime('23:00', at(23, 30)).onTime).toBe(false)
  })
  it('NOT on-time at 22:00 (too early)', () => {
    expect(evaluateBedtime('23:00', at(22, 0)).onTime).toBe(false)
  })
})

describe('shouldNagBedtime', () => {
  it('fires at 22:50 for bed=23:00', () => {
    expect(shouldNagBedtime('23:00', at(22, 50))).toBe(true)
  })
  it('does not fire at 22:30', () => {
    expect(shouldNagBedtime('23:00', at(22, 30))).toBe(false)
  })
  it('does not fire at 23:01', () => {
    expect(shouldNagBedtime('23:00', at(23, 1))).toBe(false)
  })
})
