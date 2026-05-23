export function Header({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <header className="safe-pt safe-px pt-3 pb-3 border-b border-line bg-bg/95 backdrop-blur sticky top-0 z-30">
      <h1 className="shout text-volt text-2xl leading-none">{title}</h1>
      {subtitle && (
        <p className="text-dim text-xs mt-1 shout tracking-widest">{subtitle}</p>
      )}
    </header>
  )
}
