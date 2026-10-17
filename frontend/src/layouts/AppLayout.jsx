import { NavLink, Outlet } from 'react-router-dom'
import { Waves, Clock, Settings } from 'lucide-react'
import BackendStatus from '../components/BackendStatus.jsx'
const nav = [['/', 'Analyze', Waves], ['/history', 'History', Clock], ['/settings', 'Settings', Settings]]
export default function AppLayout() {
  return (
    <div className="scene min-h-screen">
      <header className="flex items-center justify-between px-6 py-4">
        <div><div className="brand text-xl">MIRROR</div><div className="text-xs muted">Detect · Explain · Mitigate</div></div>
        <BackendStatus />
      </header>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-10 md:flex-row">
        <nav aria-label="Main" className="flex flex-wrap gap-2 md:w-44 md:flex-col">
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 md:gap-3 md:px-4 md:py-2.5 text-sm font-semibold ${isActive ? 'bg-[#38D6E8]/20 text-[#38D6E8]' : 'muted hover:bg-white/5'}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    </div>
  )
}
