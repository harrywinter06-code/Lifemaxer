import { describe, it, expect } from 'vitest'
import { dietNudge } from './diet'

describe('diet nudge', () => {
  it('asks for more weigh-ins under 3 entries', () => {
    expect(dietNudge([]).suggestion).toBe('hold')
    expect(dietNudge([{ date: '2026-05-01', kg: 65 }]).suggestion).toBe('hold')
  })

  it('+250 when kg/wk < 0.2', () => {
    const n = dietNudge([
      { date: '2026-05-01', kg: 65.0 },
      { date: '2026-05-04', kg: 65.05 },
      { date: '2026-05-08', kg: 65.1 },
    ])
    expect(n.suggestion).toBe('increase')
    expect(n.kcalDelta).toBe(250)
  })

  it('-150 when kg/wk > 0.6', () => {
    const n = dietNudge([
      { date: '2026-05-01', kg: 65.0 },
      { date: '2026-05-04', kg: 65.5 },
      { date: '2026-05-08', kg: 66.0 },
    ])
    expect(n.suggestion).toBe('decrease')
    expect(n.kcalDelta).toBe(-150)
  })

  it('holds in the sweet spot (~0.3–0.5 kg/wk)', () => {
    const n = dietNudge([
      { date: '2026-05-01', kg: 65.0 },
      { date: '2026-05-04', kg: 65.2 },
      { date: '2026-05-08', kg: 65.4 },
    ])
    expect(n.suggestion).toBe('hold')
    expect(n.kcalDelta).toBe(0)
  })

  it('uses only the last `window` entries', () => {
    // Very fast gain in old entries should be ignored; recent slow → +250.
    const n = dietNudge(
      [
        { date: '2026-01-01', kg: 60 },
        { date: '2026-01-08', kg: 62 },
        { date: '2026-05-01', kg: 65.0 },
        { date: '2026-05-04', kg: 65.02 },
        { date: '2026-05-08', kg: 65.05 },
      ],
      3,
    )
    expect(n.suggestion).toBe('increase')
  })
})
