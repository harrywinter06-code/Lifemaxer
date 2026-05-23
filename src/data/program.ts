import type { ProgramDay } from './types'

// 6-day split, single-block order: PA → PullA → LA → PB → PullB → LB.
// Each muscle is hit 2x/week. Joint-safe selection per SPEC §4.

export const PROGRAM: ProgramDay[] = [
  {
    dayId: 'push-a',
    label: 'PUSH A — CHEST',
    prehab: 'shoulder',
    exercises: [
      { exId: 'pa-mcp',  name: 'Machine Chest Press',           type: 'compound', sets: 3, lo: 8,  hi: 10, rir: 2 },
      { exId: 'pa-idp',  name: 'Incline DB Press (15–30°)',     type: 'compound', sets: 3, lo: 10, hi: 12, rir: 2 },
      { exId: 'pa-cfly', name: 'Cable Fly (low–mid)',           type: 'iso',      sets: 3, lo: 12, hi: 15, rir: 1 },
      { exId: 'pa-msp',  name: 'Machine Shoulder Press (neutral)', type: 'compound', sets: 3, lo: 8, hi: 10, rir: 2 },
      { exId: 'pa-clr',  name: 'Cable Lateral Raise',           type: 'iso',      sets: 3, lo: 12, hi: 15, rir: 1 },
      { exId: 'pa-tpr',  name: 'Triceps Pushdown (rope)',       type: 'iso',      sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'pa-oce',  name: 'Overhead Cable Extension',      type: 'iso',      sets: 2, lo: 12, hi: 15, rir: 1 },
    ],
  },
  {
    dayId: 'pull-a',
    label: 'PULL A — BACK WIDTH',
    prehab: 'shoulder',
    exercises: [
      { exId: 'pula-lpn',  name: 'Lat Pulldown (neutral)',      type: 'compound', sets: 3, lo: 8,  hi: 10, rir: 2 },
      { exId: 'pula-csr',  name: 'Chest-Supported Row',         type: 'compound', sets: 3, lo: 8,  hi: 12, rir: 2 },
      { exId: 'pula-sacr', name: 'Single-Arm Cable Row',        type: 'compound', sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'pula-fp',   name: 'Face Pull',                   type: 'iso',      sets: 3, lo: 15, hi: 20, rir: 1 },
      { exId: 'pula-dbhc', name: 'DB Hammer Curl',              type: 'iso',      sets: 3, lo: 8,  hi: 12, rir: 1 },
      { exId: 'pula-idbc', name: 'Incline DB Curl',             type: 'iso',      sets: 3, lo: 10, hi: 12, rir: 1 },
    ],
  },
  {
    dayId: 'legs-a',
    label: 'LEGS A — QUADS',
    prehab: 'knee',
    exercises: [
      { exId: 'la-lp',   name: 'Leg Press (feet high)',         type: 'compound', sets: 4, lo: 10, hi: 12, rir: 2 },
      { exId: 'la-hs',   name: 'Hack Squat (pain-free ROM)',    type: 'compound', sets: 3, lo: 10, hi: 12, rir: 2 },
      { exId: 'la-rdl',  name: 'Romanian Deadlift',             type: 'compound', sets: 3, lo: 10, hi: 12, rir: 2 },
      { exId: 'la-slc',  name: 'Seated Leg Curl',               type: 'iso',      sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'la-rl',   name: 'Reverse Lunge',                 type: 'compound', sets: 2, lo: 10, hi: 10, rir: 1 },
      { exId: 'la-scr',  name: 'Standing Calf Raise',           type: 'iso',      sets: 4, lo: 8,  hi: 12, rir: 1 },
      { exId: 'la-hkr',  name: 'Hanging Knee Raise',            type: 'iso',      sets: 3, lo: 10, hi: 15, rir: 1 },
    ],
  },
  {
    dayId: 'push-b',
    label: 'PUSH B — SHOULDERS',
    prehab: 'shoulder',
    exercises: [
      { exId: 'pb-msp',  name: 'Machine Shoulder Press (neutral)', type: 'compound', sets: 3, lo: 8, hi: 10, rir: 2 },
      { exId: 'pb-clr',  name: 'Cable Lateral Raise',           type: 'iso',      sets: 4, lo: 12, hi: 15, rir: 1 },
      { exId: 'pb-idpl', name: 'Incline DB Press (low)',        type: 'compound', sets: 3, lo: 10, hi: 12, rir: 2 },
      { exId: 'pb-pd',   name: 'Pec Deck',                      type: 'iso',      sets: 3, lo: 12, hi: 15, rir: 1 },
      { exId: 'pb-rpd',  name: 'Reverse Pec Deck',              type: 'iso',      sets: 3, lo: 15, hi: 15, rir: 1 },
      { exId: 'pb-ezsk', name: 'EZ Skull Crusher',              type: 'iso',      sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'pb-tp',   name: 'Triceps Pushdown',              type: 'iso',      sets: 3, lo: 12, hi: 15, rir: 1 },
    ],
  },
  {
    dayId: 'pull-b',
    label: 'PULL B — BACK THICKNESS',
    prehab: 'shoulder',
    exercises: [
      { exId: 'pulb-csrh', name: 'Chest-Supported Row (heavy)', type: 'compound', sets: 3, lo: 8,  hi: 10, rir: 2 },
      { exId: 'pulb-lpc',  name: 'Lat Pulldown (close)',        type: 'compound', sets: 3, lo: 8,  hi: 12, rir: 2 },
      { exId: 'pulb-scrw', name: 'Seated Cable Row (wide)',     type: 'compound', sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'pulb-sap',  name: 'Straight-Arm Pulldown',       type: 'iso',      sets: 3, lo: 12, hi: 15, rir: 1 },
      { exId: 'pulb-dbs',  name: 'DB Shrug',                    type: 'iso',      sets: 3, lo: 10, hi: 15, rir: 1 },
      { exId: 'pulb-pc',   name: 'Preacher Curl',               type: 'iso',      sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'pulb-cc',   name: 'Cable Curl',                  type: 'iso',      sets: 2, lo: 12, hi: 15, rir: 1 },
    ],
  },
  {
    dayId: 'legs-b',
    label: 'LEGS B — POSTERIOR CHAIN',
    prehab: 'knee',
    exercises: [
      { exId: 'lb-rdl',  name: 'Romanian Deadlift',             type: 'compound', sets: 4, lo: 8,  hi: 10, rir: 2 },
      { exId: 'lb-bss',  name: 'Bulgarian Split Squat (long)',  type: 'compound', sets: 3, lo: 10, hi: 10, rir: 2 },
      { exId: 'lb-ht',   name: 'Hip Thrust',                    type: 'compound', sets: 3, lo: 10, hi: 12, rir: 2 },
      { exId: 'lb-llc',  name: 'Lying Leg Curl',                type: 'iso',      sets: 3, lo: 10, hi: 12, rir: 1 },
      { exId: 'lb-hsl',  name: 'Hack Squat (light)',            type: 'compound', sets: 3, lo: 12, hi: 15, rir: 1 },
      { exId: 'lb-scr',  name: 'Seated Calf Raise',             type: 'iso',      sets: 4, lo: 12, hi: 15, rir: 1 },
      { exId: 'lb-cab',  name: 'Cable Crunch',                  type: 'iso',      sets: 3, lo: 12, hi: 15, rir: 1 },
    ],
  },
]

export function getDay(dayId: string): ProgramDay {
  const d = PROGRAM.find((p) => p.dayId === dayId)
  if (!d) throw new Error(`unknown dayId: ${dayId}`)
  return d
}

export function getDayByIndex(programDay: number): ProgramDay {
  // programDay advances on session completion; cycles through PROGRAM order.
  return PROGRAM[programDay % PROGRAM.length]
}
