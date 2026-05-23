import type { ReactNode } from 'react'

export function Screen({ children }: { children: ReactNode }) {
  // Bottom nav is fixed h≈64; reserve room.
  return (
    <main className="min-h-full pb-[88px] safe-px flex flex-col gap-4 mx-auto max-w-app">
      {children}
    </main>
  )
}
