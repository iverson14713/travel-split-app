import { isSupabaseConfigured } from './lib/supabase'
import { SupabaseConfigError } from './components/SupabaseConfigError'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppUIProvider } from './context/AppUIContext'
import { HomePage } from './pages/HomePage'
import { CreateTripPage } from './pages/CreateTripPage'
import { JoinTripPage } from './pages/JoinTripPage'
import { TripRoomPage } from './pages/TripRoomPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'

export default function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseConfigError />
  }

  return (
    <AppUIProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateTripPage />} />
          <Route path="/join" element={<JoinTripPage />} />
          <Route path="/trip/:code" element={<TripRoomPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </BrowserRouter>
    </AppUIProvider>
  )
}
