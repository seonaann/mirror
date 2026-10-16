import { highlightText } from '../utils/highlightText.js'
export default function HighlightedResponse({ text, cue }) {
  return <p className="leading-relaxed">{highlightText(text, cue).map((s, i) => s.hit ? <mark key={i} className="cue">{s.text}</mark> : <span key={i}>{s.text}</span>)}</p>
}
