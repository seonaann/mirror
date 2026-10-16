// Splits text into segments so React renders <mark> safely (no raw HTML).
export function highlightText(text, cue) {
  if (!cue) return [{ text, hit: false }]
  const i = text.toLowerCase().indexOf(cue.toLowerCase())
  if (i < 0) return [{ text, hit: false }]
  return [{ text: text.slice(0, i), hit: false }, { text: text.slice(i, i + cue.length), hit: true }, { text: text.slice(i + cue.length), hit: false }].filter(s => s.text)
}
