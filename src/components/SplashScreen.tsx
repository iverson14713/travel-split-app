import { APP_NAME, APP_TAGLINE } from '../constants/app'

export function SplashScreen() {
  return (
    <div className="splash-screen" role="status" aria-live="polite" aria-label="載入中">
      <div className="splash-content">
        <div className="splash-icon" aria-hidden="true">
          <span className="splash-icon-symbol">✈️</span>
          <span className="splash-icon-symbol splash-icon-symbol--secondary">🧾</span>
          <span className="splash-icon-symbol splash-icon-symbol--tertiary">👥</span>
        </div>
        <h1 className="splash-title">{APP_NAME}</h1>
        <p className="splash-tagline">{APP_TAGLINE}</p>
      </div>
    </div>
  )
}
