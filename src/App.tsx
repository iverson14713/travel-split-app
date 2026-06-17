import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { CreateTripPage } from './pages/CreateTripPage'
import { JoinTripPage } from './pages/JoinTripPage'
import { TripRoomPage } from './pages/TripRoomPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateTripPage />} />
        <Route path="/join" element={<JoinTripPage />} />
        <Route path="/trip/:code" element={<TripRoomPage />} />
      </Routes>
    </BrowserRouter>
  )
}
