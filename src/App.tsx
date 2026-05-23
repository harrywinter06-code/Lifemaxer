import { useEffect, useState } from 'react'
import { Nav, type Tab } from './components/Nav'
import { InstallHint } from './components/InstallHint'
import { TrainScreen } from './screens/TrainScreen'
import { EatScreen } from './screens/EatScreen'
import { StatsScreen } from './screens/StatsScreen'
import { NowScreen } from './screens/NowScreen'
import { OnboardingWizard } from './screens/OnboardingWizard'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { getProfile } from './db/repo'

type AppStatus = 'loading' | 'onboarding' | 'ready'

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading')
  const [tab, setTab] = useState<Tab>('now')

  const [bootstrapVersion, setBootstrapVersion] = useState(0)
  const reboot = () => setBootstrapVersion((v) => v + 1)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await getProfile()
      if (cancelled) return
      setStatus(p.onboarded ? 'ready' : 'onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [bootstrapVersion])

  if (status === 'loading') {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="font-display text-volt text-5xl tracking-[0.2em]">DRILL</div>
      </div>
    )
  }

  if (status === 'onboarding') {
    return <OnboardingWizard onDone={reboot} />
  }

  return (
    <div className="min-h-full">
      {tab === 'now'   && <NowScreen onGoTo={(t) => setTab(t)} />}
      {tab === 'train' && <TrainScreen onFinish={() => setTab('now')} />}
      {tab === 'eat'   && <EatScreen />}
      {tab === 'coach' && <PlaceholderScreen title="COACH" hint="AI coach (Phase 7)." />}
      {tab === 'stats' && <StatsScreen />}
      <InstallHint />
      <Nav active={tab} onChange={setTab} />
    </div>
  )
}
