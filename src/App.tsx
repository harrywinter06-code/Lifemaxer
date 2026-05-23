import { useEffect, useState } from 'react'
import { Nav, type Tab } from './components/Nav'
import { InstallHint } from './components/InstallHint'
import { TrainScreen } from './screens/TrainScreen'
import { EatScreen } from './screens/EatScreen'
import { StatsScreen } from './screens/StatsScreen'
import { NowScreen } from './screens/NowScreen'
import { CoachScreen } from './screens/CoachScreen'
import { OnboardingWizard } from './screens/OnboardingWizard'
import { CloudRestorePrompt } from './screens/CloudRestorePrompt'
import { getProfile } from './db/repo'
import { requestPersistent } from './lib/storage'
import { fetchRemoteMeta, isConfigured, startAutoSync } from './lib/sync'

type AppStatus = 'loading' | 'cloud-prompt' | 'onboarding' | 'ready'

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading')
  const [tab, setTab] = useState<Tab>('now')

  const [bootstrapVersion, setBootstrapVersion] = useState(0)
  const reboot = () => setBootstrapVersion((v) => v + 1)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Best-effort: ask iOS / browser to treat our storage as durable.
      // No-op if unsupported; ignored if the prompt is denied.
      await requestPersistent()

      const p = await getProfile()
      if (cancelled) return

      // Fresh install + cloud sync configured + cloud has data? Offer restore.
      if (!p.onboarded && isConfigured()) {
        const meta = await fetchRemoteMeta()
        if (cancelled) return
        if (meta && meta.uploadedAt) {
          setStatus('cloud-prompt')
          return
        }
      }

      // Subscribe writes -> debounced cloud upload (no-op if not configured).
      startAutoSync()

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

  if (status === 'cloud-prompt') {
    return <CloudRestorePrompt onDone={reboot} />
  }

  if (status === 'onboarding') {
    return <OnboardingWizard onDone={reboot} />
  }

  return (
    <div className="min-h-full">
      {tab === 'now'   && <NowScreen onGoTo={(t) => setTab(t)} />}
      {tab === 'train' && <TrainScreen onFinish={() => setTab('now')} />}
      {tab === 'eat'   && <EatScreen />}
      {tab === 'coach' && <CoachScreen />}
      {tab === 'stats' && <StatsScreen />}
      <InstallHint />
      <Nav active={tab} onChange={setTab} />
    </div>
  )
}
