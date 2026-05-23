import { useState } from 'react'
import { Nav, type Tab } from './components/Nav'
import { TrainScreen } from './screens/TrainScreen'
import { EatScreen } from './screens/EatScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'

export default function App() {
  const [tab, setTab] = useState<Tab>('train')

  return (
    <div className="min-h-full">
      {tab === 'now' && (
        <PlaceholderScreen title="NOW" hint="Drill-sergeant command center (Phase 5)." />
      )}
      {tab === 'train' && <TrainScreen onFinish={() => setTab('now')} />}
      {tab === 'eat' && <EatScreen />}
      {tab === 'coach' && (
        <PlaceholderScreen title="COACH" hint="AI coach chat (Phase 7)." />
      )}
      {tab === 'stats' && (
        <PlaceholderScreen title="STATS" hint="Trends + settings (Phase 4)." />
      )}
      <Nav active={tab} onChange={setTab} />
    </div>
  )
}
