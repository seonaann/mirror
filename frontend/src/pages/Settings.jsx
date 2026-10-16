import { useState } from 'react'
import { getSettings, saveSettings, checkHealth, LABELS } from '../services/api.js'
export default function Settings() {
  const [s, setS] = useState(getSettings()), [conn, setConn] = useState(null)
  const update = (patch) => { const n = { ...s, ...patch }; setS(n); saveSettings(n) }
  return (
    <div className="panel space-y-5 p-6">
      <h1 className="brand text-xl">Settings</h1>
      <div><label htmlFor="url" className="muted text-sm">Backend URL</label>
        <div className="mt-1 flex gap-2"><input id="url" className="field" value={s.baseUrl} onChange={e => { update({ baseUrl: e.target.value }); setConn(null) }} />
          <button className="btn btn-ghost whitespace-nowrap" onClick={async () => setConn(await checkHealth(s.baseUrl))}>Test</button></div>
        {conn !== null && <p role="status" className="mt-1 text-sm" style={{ color: conn ? 'var(--green)' : 'var(--red)' }}>{conn ? 'Connected' : 'Could not connect'}</p>}</div>
      <div><label htmlFor="th" className="muted flex justify-between text-sm">Confidence threshold<b>{s.threshold}</b></label>
        <input id="th" type="range" min="0" max="1" step="0.05" className="w-full accent-[#38D6E8]" value={s.threshold} onChange={e => update({ threshold: +e.target.value })} /></div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 accent-[#38D6E8]" checked={!!s.saveHistory} onChange={e => update({ saveHistory: e.target.checked })} />
        <span><b>Save analyses to History</b><br /><span className="muted text-xs">Stored only in this browser. Possible private data is highlighted there, and you can redact or delete it.</span></span>
      </label>
      <section><h2 className="font-bold">About MIRROR</h2>
        <p className="muted text-sm">MIRROR detects implicit demographic assumptions in AI-generated responses, explains the evidence, and suggests a counterfactual rewrite.</p>
        <div className="mt-2 flex flex-wrap gap-2">{LABELS.map(l => <span key={l} className="rounded-full bg-white/10 px-3 py-1 text-xs">{l.replace('_', ' ')}</span>)}</div></section>
      <p className="muted text-xs">Privacy: text is sent only to your MIRROR server.</p>
    </div>
  )
}
