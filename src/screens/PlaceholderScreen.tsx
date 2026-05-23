import { Header } from '../components/Header'
import { Screen } from '../components/Screen'

export function PlaceholderScreen({
  title,
  hint,
}: {
  title: string
  hint: string
}) {
  return (
    <Screen>
      <Header title={title} subtitle="Coming up next" />
      <div className="panel-pad text-dim text-sm">{hint}</div>
    </Screen>
  )
}
