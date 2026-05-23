// Tiny pub-sub the repository fires when data changes, so the sync layer
// can debounce uploads without creating a circular import.

type Listener = () => void
const listeners = new Set<Listener>()

export function notifyWrite(): void {
  for (const fn of listeners) fn()
}

export function subscribeWrite(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
