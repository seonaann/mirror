import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Analyze from './pages/Analyze.jsx'
import Settings from './pages/Settings.jsx'
const Soon = ({ name }) => <div className="panel p-8 muted">{name} needs a backend endpoint that isn't available yet.</div>
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Analyze />} />
        <Route path="history" element={<Soon name="History" />} />
        <Route path="research" element={<Soon name="Research" />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
