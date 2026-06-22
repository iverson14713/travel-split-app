interface CapacitorBrowserPlugin {
  open: (options: { url: string }) => Promise<void>
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  Plugins?: {
    Browser?: CapacitorBrowserPlugin
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor

  if (capacitor?.isNativePlatform?.() && capacitor.Plugins?.Browser?.open) {
    try {
      await capacitor.Plugins.Browser.open({ url })
      return
    } catch {
      // fall through to web fallback
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
