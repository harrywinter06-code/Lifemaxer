import { useState } from 'react'
import { X } from '../components/Icon'

const KEY = 'drill:install-hint-dismissed'

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
  return isIOS && isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS-only flag
    window.navigator.standalone === true
  )
}

function shouldShowInitial(): boolean {
  if (typeof window === 'undefined') return false
  if (isStandalone()) return false
  if (!isIOSSafari()) return false
  if (localStorage.getItem(KEY) === '1') return false
  return true
}

export function InstallHint() {
  const [show, setShow] = useState(shouldShowInitial)

  if (!show) return null

  return (
    <div className="fixed bottom-[80px] inset-x-2 z-50 panel-pad border-volt bg-panel/95 backdrop-blur flex items-start gap-3">
      <div className="flex-1">
        <div className="shout text-volt text-sm">PUT ME ON YOUR HOME SCREEN.</div>
        <p className="text-xs text-dim mt-1">
          Safari → Share → <span className="text-text">Add to Home Screen</span>. Then open
          DRILL like a real app.
        </p>
      </div>
      <button
        aria-label="dismiss install hint"
        onClick={() => {
          localStorage.setItem(KEY, '1')
          setShow(false)
        }}
        className="text-dim active:text-text"
      >
        <X size={18} />
      </button>
    </div>
  )
}
