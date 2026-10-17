import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Analyze from './pages/Analyze.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Analyze />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
