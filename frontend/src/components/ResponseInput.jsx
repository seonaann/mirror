import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
export const MIN = 10, MAX = 2000
export default function ResponseInput({ value, onChange, prompt, onPrompt, onSubmit, onClear, disabled }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [touched, setTouched] = useState(false)
  const len = value.trim().length
  const err = touched && len < MIN ? `Enter a response (minimum ${MIN} characters).` : null
  const over = value.length > MAX
  const valid = len >= MIN && !over
  const showingPrompt = showPrompt || prompt.length > 0 // captured prompts are shown, not hidden
  return (
    <div className="panel space-y-4 p-6">
      <h1 className="brand text-xl">Analyze a response</h1>
      <div>
        <label htmlFor="resp" className="muted mb-1 block text-sm">Paste an AI response</label>
        <textarea id="resp" rows={6} maxLength={MAX} className="field" value={value} disabled={disabled} aria-invalid={!!err}
          onChange={e => onChange(e.target.value)} onBlur={() => setTouched(true)} placeholder="Paste an AI response here…" />
        <div className="muted text-right text-xs">{value.length}/{MAX}</div>
        {err && <p role="alert" className="text-sm text-[#DC5555]">{err}</p>}
        {over && <p role="alert" className="text-sm text-[#DC5555]">This is {value.length - MAX} characters over the {MAX} limit. Shorten it to analyze.</p>}
      </div>
      <button type="button" className="field flex items-center justify-between text-left text-sm" aria-expanded={showingPrompt} onClick={() => setShowPrompt(!showPrompt)}>
        Add original prompt (optional)<ChevronDown size={16} className={showingPrompt ? 'rotate-180' : ''} /></button>
      {showingPrompt && <textarea aria-label="Original prompt" rows={3} className="field" value={prompt} disabled={disabled} onChange={e => onPrompt(e.target.value)} />}
      <div className="flex gap-3">
        <button className="btn flex-1" disabled={!valid || disabled} onClick={onSubmit}><Sparkles size={16} />Analyze</button>
        <button className="btn btn-ghost" disabled={disabled} onClick={() => { setTouched(false); onClear() }}>Clear</button>
      </div>
      <p className="muted text-xs">Predictions can be wrong.</p>
    </div>
  )
}
