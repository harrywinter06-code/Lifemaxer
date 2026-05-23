import type { PrehabItem, PrehabKind } from './types'

export const PREHAB: Record<PrehabKind, PrehabItem[]> = {
  shoulder: [
    { name: 'Band Pull-Apart',          detail: '2×20' },
    { name: 'Wall Slide',               detail: '2×10' },
    { name: 'Prone Y-Raise',            detail: '2×12' },
    { name: 'Banded External Rotation', detail: '2×15/arm' },
    { name: 'Doorway Pec-Minor Stretch',detail: '2×30s' },
  ],
  knee: [
    { name: 'Spanish Squat',            detail: '2×12' },
    { name: 'Tibialis Raise',           detail: '2×15' },
    { name: 'Lateral Band Walk',        detail: '2×10/side' },
    { name: 'Wall Sit (pain-free)',     detail: '2×40s' },
    { name: 'Couch / Quad Stretch',     detail: '2×30s/side' },
  ],
}
