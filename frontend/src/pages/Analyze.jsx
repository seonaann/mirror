import { useState } from 'react'
import useAnalysis from '../hooks/useAnalysis.js'
import { getSettings } from '../services/api.js'
import ResponseInput from '../components/ResponseInput.jsx'
import CapturePanel from '../components/CapturePanel.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import BiasBanner from '../components/BiasBanner.jsx'
import ConfidenceMeter from '../components/ConfidenceMeter.jsx'
import HighlightedResponse from '../components/HighlightedResponse.jsx'
import CategoryScores from '../components/CategoryScores.jsx'
import CounterfactualComparison from '../components/CounterfactualComparison.jsx'

export default function Analyze() {
  const [text, setText] = useState(''), [prompt, setPrompt] = useState(''), [tab, setTab] = useState('report')
  const { status, result, error, run, reset } = useAnalysis()
  const submit = () => { setTab('report'); run({ response: text.trim(), prompt: prompt.trim() }) }
  const busy = status === 'loading'
  const fillFromTurn = (t) => { setText(t.response); setPrompt(t.prompt || '') } // fills the editable fields only; analysis still needs the Analyze button
  const form = (
    <div className="space-y-4">
      <CapturePanel onUse={fillFromTurn} disabled={busy} />
      <ResponseInput value={text} onChange={setText} prompt={prompt} onPrompt={setPrompt} onSubmit={submit} onClear={() => { setText(''); setPrompt(''); reset() }} disabled={busy} />
    </div>
  )

  if (status === 'idle') return form
  if (status === 'loading') return <div className="space-y-4">{form}<LoadingSkeleton /></div>
  if (status === 'error') return <ErrorMessage error={error} onRetry={submit} />

  const biased = result.label !== 'none' && result.confidence >= getSettings().threshold
  return (
    <div className="panel space-y-4 p-6">
      <div role="tablist" className="grid grid-cols-2 rounded-xl bg-white/5 p-1">
        {['report', 'counterfactual'].map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
          className={`rounded-lg py-2 text-sm font-bold capitalize ${tab === t ? 'bg-[#38D6E8]/25 text-[#38D6E8]' : 'muted'}`}>{t}</button>)}
      </div>
      {tab === 'report' ? <>
        <BiasBanner label={result.label} biased={biased} />
        <ConfidenceMeter value={result.confidence} />
        {biased && result.cue && <div className="rounded-xl bg-[#DC5555]/20 p-3 text-sm"><div className="muted text-xs">Highlighted cue</div>“{result.cue}”</div>}
        <section><div className="muted mb-1 text-xs">Original response</div><HighlightedResponse text={text} cue={biased ? result.cue : null} /></section>
        <CategoryScores probabilities={result.probabilities} top={result.label} />
      </> : <CounterfactualComparison original={text} result={result} biased={biased} />}
      <button className="btn w-full" onClick={reset}>Analyze another</button>
    </div>
  )
}
