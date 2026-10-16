import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import HighlightedResponse from './HighlightedResponse.jsx'
const Metric = ({ label, v }) => <div className="rounded-xl border border-white/10 p-3 text-center"><div className="muted text-xs">{label}</div><div className="text-lg font-bold">{v ?? 'Not calculated'}</div></div>
export default function CounterfactualComparison({ original, result, biased }) {
  const [copied, setCopied] = useState(false)
  const cf = result.counterfactual
  if (!biased) return <div className="p-8 text-center"><h2 className="font-bold">Nothing to rewrite</h2><p className="muted text-sm">No assumption was detected in this response.</p></div>
  if (!cf?.text) {
  const message =
    cf?.status === 'generation_failed'
      ? 'Counterfactual generation failed. Check the backend terminal for the error, then try again.'
      : 'The backend did not return a rewrite for this response.'

  return (
    <div role="status" className="p-8 text-center muted">
      {message}
    </div>
  )
}
  const copy = async () => { await navigator.clipboard.writeText(cf.text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const pct = (n) => (typeof n === 'number' ? Math.round(n * 100) + '%' : null)
  return (
    <div className="space-y-4">
      <h2 className="brand text-lg">What the AI should have said</h2>
      <div className="rounded-xl bg-[#36A879]/20 px-3 py-1.5 text-xs font-bold">
        {cf.still_biased == null ? 'Re-check not available' : cf.still_biased ? 'Re-checked: bias still detected' : 'Re-checked: no bias detected'}</div>
      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">Rewritten response
          <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button></div>
        <p className="leading-relaxed">{cf.text}</p>
        {cf.prompt && <p className="muted mt-3 text-sm"><b>Rewrite prompt:</b> {cf.prompt}</p>}
      </section>
      <section className="rounded-xl border border-white/10 p-4"><div className="mb-2 text-sm font-bold">Original response</div>
        <HighlightedResponse text={original} cue={result.cue} /></section>
      <div className="grid grid-cols-2 gap-3"><Metric label="Semantic similarity" v={pct(cf.similarity)} /><Metric label="Assumption drift score" v={cf.drift?.toFixed?.(2)} /></div>
    </div>
  )
}
