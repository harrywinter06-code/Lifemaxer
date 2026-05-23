import {
  Activity,
  Apple,
  BarChart3,
  Bot,
  Flag,
  type LucideIcon,
} from './Icon'

export type Tab = 'now' | 'train' | 'eat' | 'coach' | 'stats'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'now',   label: 'NOW',   icon: Flag },
  { id: 'train', label: 'TRAIN', icon: Activity },
  { id: 'eat',   label: 'EAT',   icon: Apple },
  { id: 'coach', label: 'COACH', icon: Bot },
  { id: 'stats', label: 'STATS', icon: BarChart3 },
]

export function Nav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-panel border-t border-line safe-pb z-40"
      role="navigation"
    >
      <div className="mx-auto max-w-app grid grid-cols-5">
        {TABS.map((t) => {
          const isActive = t.id === active
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 active:bg-panel2 transition ${
                isActive ? 'text-volt' : 'text-dim'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="shout text-[10px] tracking-widest">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
