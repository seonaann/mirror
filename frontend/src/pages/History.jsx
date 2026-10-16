import { useMemo, useState } from 'react'
import { ChevronDown, EyeOff, Search, ShieldAlert, Trash2 } from 'lucide-react'
import useHistory from '../hooks/useHistory.js'
import { clearHistory, deleteEntry, redactEntry } from '../services/history.js'
import { detectSensitive } from '../utils/sensitive.js'
import SensitiveText from '../components/SensitiveText.jsx'

const fmt = (t) => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const fields = (e) => [e.title, e.prompt, e.response, e.counterfactual?.text, e.counterfactual?.prompt]
const scan = (e) => {
  const all = fields(e).flatMap((t) => detectSensitive(t || ''))
  return { count: all.length, labels: [...new Set(all.map((s) => s.label))] }
}

// Two-step destructive button: first click arms it, second click confirms.
function ConfirmButton({ label, confirmLabel, onConfirm }) {
  const [armed, setArmed] = useState(false)
  if (!armed) return <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setArmed(true)}><Trash2 size={14} />{label}</button>
  return (
    <span className="flex items-center gap-2">
      <button className="btn !px-3 !py-1.5 text-sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={onConfirm}>{confirmLabel}</button>
      <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setArmed(false)}>Cancel</button>
    </span>
  )
}

const Section = ({ title, children }) => <section><div className="muted mb-1 text-xs">{title}</div>{children}</section>

function Entry({ e, s, open, onToggle }) {
  const cf = e.counterfactual
  return (
    <li className="panel overflow-hidden">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{e.title}</div>
          <div className="muted mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span>{fmt(e.createdAt)}</span>
            <span className={`rounded-full px-2 py-0.5 ${e.biased ? 'bg-[#DC5555]/25' : 'bg-[#36A879]/25'}`}>{e.biased ? (e.label || '').replace(/_/g, ' ') : 'no bias'}</span>
            {s.count > 0 && <span className="flex items-center gap-1 rounded-full bg-[#F5B041]/25 px-2 py-0.5 text-[#F5B041]"><ShieldAlert size={12} />{s.count} sensitive</span>}
          </div>
        </div>
        <ChevronDown size={18} className={`mt-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          {s.count > 0 && (
            <div role="alert" className="rounded-xl bg-[#F5B041]/15 p-3 text-sm">
              <b>Possible private information found:</b> {s.labels.join(', ')}.
              <div className="muted mt-1 text-xs">Highlighted below. Redact it to keep the entry without the private data, or delete the whole entry.</div>
            </div>
          )}
          {e.prompt && <Section title="Prompt"><SensitiveText text={e.prompt} /></Section>}
          <Section title="Response"><SensitiveText text={e.response} /></Section>
          {cf?.text ? (
            <>
              <Section title="Counterfactual response"><SensitiveText text={cf.text} /></Section>
              {cf.prompt && <Section title="Counterfactual prompt"><SensitiveText text={cf.prompt} /></Section>}
            </>
          ) : <p className="muted text-sm">No counterfactual was saved for this analysis.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ConfirmButton label="Delete" confirmLabel="Delete permanently" onConfirm={() => deleteEntry(e.id)} />
            {s.count > 0 && <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={() => redactEntry(e.id)}><EyeOff size={14} />Redact sensitive info</button>}
          </div>
        </div>
      )}
    </li>
  )
}

export default function History() {
  const items = useHistory()
  const [q, setQ] = useState(''), [onlySensitive, setOnlySensitive] = useState(false), [openId, setOpenId] = useState(null)
  const rows = useMemo(() => items.map((e) => ({ e, s: scan(e) })), [items])
  const needle = q.trim().toLowerCase()
  const shown = rows.filter(({ e, s }) => (!onlySensitive || s.count > 0) &&
    (!needle || [e.title, e.prompt, e.response].some((t) => (t || '').toLowerCase().includes(needle))))
  const flagged = rows.filter((r) => r.s.count > 0).length

  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="brand text-xl">History</h1>
            <p className="muted text-xs">{items.length} saved · {flagged} with possible private data · stored only in this browser</p>
          </div>
          {items.length > 0 && <ConfirmButton label="Clear all" confirmLabel="Delete everything" onConfirm={clearHistory} />}
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-40 flex-1">
              <Search size={16} className="muted absolute top-1/2 left-3 -translate-y-1/2" />
              <input className="field !pl-9" placeholder="Search history" aria-label="Search history" value={q} onChange={(ev) => setQ(ev.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#38D6E8]" checked={onlySensitive} onChange={(ev) => setOnlySensitive(ev.target.checked)} />
              Only with private data
            </label>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="panel muted p-8 text-center text-sm">Nothing saved yet. Analyzed responses appear here automatically. You can turn this off in Settings.</div>
      ) : shown.length === 0 ? (
        <div className="panel muted p-8 text-center text-sm">No entries match.</div>
      ) : (
        <ul className="space-y-3">
          {shown.map(({ e, s }) => <Entry key={e.id} e={e} s={s} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />)}
        </ul>
      )}
    </div>
  )
}
