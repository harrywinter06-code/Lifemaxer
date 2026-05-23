import { describe, it, expect } from 'vitest'
import { deloadStatus, detectStall, deloadPrescription } from './deload'
import type { Profile, WorkoutSession } from '../db/types'
import { DEFAULT_PROFILE } from '../data/seed'

const baseProfile = (startISO: string): Profile => ({
  ...DEFAULT_PROFILE,
  startDate: startISO,
})

function mkSession(date: string, dayId: string, topWeight: number, topReps: number[]): WorkoutSession {
  return {
    date,
    dayId,
    mode: 'normal',
    exercises: [
      {
        exId: 'pa-mcp',
        name: 'Machine Chest Press',
        sets: topReps.map((r) => ({ w: topWeight, r })),
      },
    ],
  }
}

describe('deload window', () => {
  it('fires after 7 weeks since start', () => {
    const now = new Date('2026-06-25T10:00:00')
    const start = '2026-05-01'
    const status = deloadStatus(baseProfile(start), [], now)
    expect(status.isDeload).toBe(true)
    expect(status.reason).toBe('window')
  })

  it('countdown reflects weeks remaining', () => {
    const now = new Date('2026-05-15T10:00:00')
    const status = deloadStatus(baseProfile('2026-05-01'), [], now)
    expect(status.isDeload).toBe(false)
    expect(status.weeksUntilDeload).toBeGreaterThan(0)
  })
})

describe('stall detection', () => {
  it('triggers when last two same-day sessions show no progress', () => {
    // Three Push-A sessions, all identical → 2 stalls (no progress N vs N-1, no progress N-1 vs N-2).
    const sessions = [
      mkSession('2026-05-08', 'push-a', 50, [10, 10, 9]),
      mkSession('2026-05-05', 'push-a', 50, [10, 10, 9]),
      mkSession('2026-05-01', 'push-a', 50, [10, 10, 9]),
      mkSession('2026-04-28', 'push-a', 50, [10, 10, 9]),
    ]
    expect(detectStall(sessions)).toBe(true)
  })

  it('does not trigger when reps improved', () => {
    const sessions = [
      mkSession('2026-05-08', 'push-a', 50, [10, 10, 10]),
      mkSession('2026-05-05', 'push-a', 50, [10, 10, 9]),
      mkSession('2026-05-01', 'push-a', 50, [10, 9, 9]),
    ]
    expect(detectStall(sessions)).toBe(false)
  })

  it('does not trigger with too little history', () => {
    expect(detectStall([])).toBe(false)
  })
})

describe('deload prescription', () => {
  it('halves sets and pushes RIR way up', () => {
    const out = deloadPrescription([{ sets: 4, rir: 1 }, { sets: 3, rir: 2 }])
    expect(out[0].sets).toBe(2)
    expect(out[0].rir).toBeGreaterThanOrEqual(4)
    expect(out[1].sets).toBe(1)
    expect(out[1].rir).toBeGreaterThanOrEqual(5)
  })
})
