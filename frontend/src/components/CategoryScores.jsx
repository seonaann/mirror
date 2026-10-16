import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LABELS } from '../services/api.js'
export default function CategoryScores({ probabilities, top }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <button className="flex w-full items-center justify-between text-sm font-semibold" aria-expanded={open} onClick={() => setOpen(!open)}>
        All category scores<ChevronDown size={16} className={open ? 'rotate-180' : ''} />
      </button>
      {open && <ul className="mt-3 space-y-2">{LABELS.map(l => {
        const p = Math.round((probabilities[l] ?? 0) * 100)
        return <li key={l} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-2 text-xs">
          <span>{l.replace('_', ' ')}</span>
          <span className="h-1.5 rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: p + '%', background: l === top ? 'var(--cyan)' : 'var(--turq)', opacity: l === top ? 1 : .6 }} /></span>
          <span className="text-right">{p}%</span></li>
      })}</ul>}
    </div>
  )
}
