import type { Nag } from './push'

type Schedule = { wake: string; train: string; bed: string }

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fmt(min: number): string {
  const norm = ((min % (24 * 60)) + 24 * 60) % (24 * 60)
  return `${String(Math.floor(norm / 60)).padStart(2, '0')}:${String(norm % 60).padStart(2, '0')}`
}

const N = (key: string, title: string, body: string): Nag => ({
  key, title, body, tag: key,
})

/** Returns the daily nag schedule for this user, computed from their times. */
export function scheduledNags(s: Schedule): { time: string; nag: Nag }[] {
  const wake = toMin(s.wake)
  const train = toMin(s.train)
  const bed = toMin(s.bed)
  return [
    { time: fmt(wake),        nag: N('wake',     'RISE.',                  'On the scale. Then oats.') },
    { time: fmt(wake + 30),   nag: N('breakfast','EAT. 48G PROTEIN.',      'Overnight oats + scoop whey. Make it disappear.') },
    { time: fmt(train - 30),  nag: N('prep',     'PREHAB IN 30.',          'Shoulder or knee. No exceptions.') },
    { time: fmt(train),       nag: N('train',    'TRAIN. NOW.',            'No phone between sets.') },
    { time: fmt(train + 150), nag: N('lunch',    'EAT LUNCH.',             'Wraps + chicken + cheese + spinach.') },
    { time: fmt(train + 360), nag: N('snack',    'AFTERNOON FUEL.',        'Greek yogurt + granola + honey.') },
    { time: fmt(train + 540), nag: N('dinner',   'EAT DINNER.',            'One-pan beef pasta.') },
    { time: fmt(bed - 10),    nag: N('winddown', '10 MIN TO LIGHTS OUT.',  'Phone face-down soon. Tap LIGHTS OUT when you do.') },
    { time: fmt(bed),         nag: N('bed',      'LIGHTS OUT.',            'Tomorrow starts now. Tap to keep the streak.') },
  ]
}

/** Local HH:MM in a given IANA timezone. */
export function localHHMM(d: Date, tz: string): string {
  // en-GB gives "HH:mm" 24h.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return fmt.format(d)
}

/** Local YYYY-MM-DD in a given IANA timezone. */
export function localDateKey(d: Date, tz: string): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return f.format(d)
}
