import { describe, it, expect } from 'vitest'
import { scheduledNags, localHHMM, localDateKey } from './nags'

describe('scheduledNags', () => {
  it('produces 9 nags for the default schedule', () => {
    const list = scheduledNags({ wake: '08:00', train: '10:00', bed: '23:00' })
    expect(list).toHaveLength(9)
    const times = list.map((x) => x.time)
    expect(times).toEqual([
      '08:00', // wake
      '08:30', // breakfast
      '09:30', // prep (train - 30)
      '10:00', // train
      '12:30', // lunch (train + 150)
      '16:00', // snack (train + 360)
      '19:00', // dinner (train + 540)
      '22:50', // winddown (bed - 10)
      '23:00', // bed
    ])
  })

  it('wraps times that overflow 24h', () => {
    const list = scheduledNags({ wake: '20:00', train: '22:00', bed: '03:00' })
    // train + 540 = 22:00 + 9h = 31:00 → 07:00
    const dinner = list.find((x) => x.nag.key === 'dinner')!
    expect(dinner.time).toBe('07:00')
  })

  it('contains expected nag keys', () => {
    const keys = scheduledNags({ wake: '08:00', train: '10:00', bed: '23:00' }).map((x) => x.nag.key)
    expect(keys).toEqual(['wake', 'breakfast', 'prep', 'train', 'lunch', 'snack', 'dinner', 'winddown', 'bed'])
  })

  it('nag bodies never reference the body or scale', () => {
    const list = scheduledNags({ wake: '08:00', train: '10:00', bed: '23:00' })
    for (const { nag } of list) {
      expect(nag.body.toLowerCase()).not.toMatch(/fat|skinny|weak|lazy|loser/)
      expect(nag.title.toLowerCase()).not.toMatch(/fat|skinny|weak|lazy|loser/)
    }
  })
})

describe('localHHMM / localDateKey', () => {
  it('formats HH:MM in a target TZ', () => {
    // 2026-05-23T22:00:00Z = 2026-05-23T23:00 in London (BST)
    const d = new Date('2026-05-23T22:00:00Z')
    expect(localHHMM(d, 'Europe/London')).toBe('23:00')
  })

  it('formats date in a target TZ', () => {
    const d = new Date('2026-05-23T23:30:00Z')
    expect(localDateKey(d, 'Europe/London')).toBe('2026-05-24')
  })
})
