import { describe, it, expect } from 'vitest'
import { parseActions } from './coach'

describe('coach.parseActions', () => {
  it('extracts a swap_exercise action', () => {
    const reply = `NO HACK SQUAT TONIGHT. SUB LEG PRESS.\n\n\`\`\`json
{"action":"swap_exercise","exId":"la-hs","newName":"Leg Press"}
\`\`\``
    const acts = parseActions(reply)
    expect(acts).toHaveLength(1)
    expect(acts[0]).toMatchObject({ action: 'swap_exercise', exId: 'la-hs' })
  })

  it('extracts a swap_meal action', () => {
    const reply = `\`\`\`json
{"action":"swap_meal","mealId":"breakfast","name":"Egg & Oats","items":["4 eggs","100g oats"],"kcal":700,"protein":50,"fat":25,"carbs":80}
\`\`\``
    const acts = parseActions(reply)
    expect(acts).toHaveLength(1)
    if (acts[0].action === 'swap_meal') {
      expect(acts[0].items).toHaveLength(2)
      expect(acts[0].kcal).toBe(700)
    }
  })

  it('ignores malformed JSON', () => {
    const reply = '```json\n{ not real }\n```'
    expect(parseActions(reply)).toHaveLength(0)
  })

  it('ignores foreign actions', () => {
    const reply = '```json\n{"action":"set_alarm","time":"07:00"}\n```'
    expect(parseActions(reply)).toHaveLength(0)
  })

  it('extracts multiple actions in one reply', () => {
    const reply =
      '```json\n{"action":"swap_exercise","exId":"a","newName":"x"}\n```\n' +
      '```json\n{"action":"swap_exercise","exId":"b","newName":"y"}\n```'
    expect(parseActions(reply)).toHaveLength(2)
  })

  it('returns empty when no fenced block', () => {
    expect(parseActions('just talking, no action')).toHaveLength(0)
  })
})
