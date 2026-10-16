import { detectSensitive, segmentBySpans } from '../utils/sensitive.js'

// Renders text with private data highlighted (React elements only, never raw HTML).
export default function SensitiveText({ text }) {
  const value = text || ''
  const parts = segmentBySpans(value, detectSensitive(value))
  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) => p.span
        ? <mark key={i} className="pii" title={p.span.label}>{p.text}<sup className="ml-1 text-[10px] font-bold">{p.span.tag}</sup></mark>
        : <span key={i}>{p.text}</span>)}
    </p>
  )
}
