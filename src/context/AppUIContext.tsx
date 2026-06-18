import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { SplashScreen } from '../components/SplashScreen'
import { OnboardingScreen } from '../components/OnboardingScreen'
import { hasSeenOnboarding, setOnboardingSeen } from '../utils/storage'

const SPLASH_DURATION_MS = 1200

const LEGAL_PATHS = new Set(['/privacy', '/terms'])

function isLegalEntryPath(): boolean {
  return LEGAL_PATHS.has(window.location.pathname)
}

interface AppUIContextValue {
  requestOnboarding: () => void
}

const AppUIContext = createContext<AppUIContextValue | null>(null)

export function AppUIProvider({ children }: { children: ReactNode }) {
  const skipLaunchUI = isLegalEntryPath()
  const [splashVisible, setSplashVisible] = useState(!skipLaunchUI)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (skipLaunchUI) return
    const timer = window.setTimeout(() => setSplashVisible(false), SPLASH_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [skipLaunchUI])

  useEffect(() => {
    if (skipLaunchUI || splashVisible || hasSeenOnboarding()) return
    setShowOnboarding(true)
  }, [skipLaunchUI, splashVisible])

  const handleOnboardingComplete = () => {
    setOnboardingSeen()
    setShowOnboarding(false)
  }

  const requestOnboarding = () => {
    setShowOnboarding(true)
  }

  return (
    <AppUIContext.Provider value={{ requestOnboarding }}>
      {children}
      {splashVisible && <SplashScreen />}
      {showOnboarding && <OnboardingScreen onComplete={handleOnboardingComplete} />}
    </AppUIContext.Provider>
  )
}

export function useAppUI(): AppUIContextValue {
  const context = useContext(AppUIContext)
  if (!context) {
    throw new Error('useAppUI must be used within AppUIProvider')
  }
  return context
}
