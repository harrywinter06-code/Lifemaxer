export function MacroBar({
  label,
  current,
  target,
  unit = 'g',
  accent = 'text-volt',
  fill = 'bg-volt',
}: {
  label: string
  current: number
  target: number
  unit?: string
  accent?: string
  fill?: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = current > target
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className={`shout text-xs tracking-widest ${accent}`}>{label}</span>
        <span className="num text-sm">
          <span className={over ? 'text-warn' : 'text-text'}>
            {Math.round(current)}
          </span>
          <span className="text-dim">/{Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded bg-bg border border-line overflow-hidden">
        <div
          className={`h-full ${over ? 'bg-warn' : fill}`}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}
