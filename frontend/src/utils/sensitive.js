// Client-side detector for private / confidential data. Runs only in the browser; nothing is sent anywhere.
// Pattern-based: structured identifiers (cards, IDs, emails, keys...) are caught reliably; names and street
// addresses only in obvious phrasing ("my name is ...", "12 Main Street"). It can miss things, so review manually.

const luhn = (digits) => {
  let sum = 0, alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = +digits[i]
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    sum += n; alt = !alt
  }
  return sum % 10 === 0
}

// Verhoeff checksum (used by Aadhaar numbers)
const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]]
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]
const verhoeff = (s) => { let c = 0; [...s].reverse().forEach((ch, i) => { c = D[c][P[i % 8][+ch]] }); return c === 0 }

const ibanOk = (v) => {
  const s = v.replace(/ /g, '')
  if (s.length < 15 || s.length > 34) return false
  const n = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55)
  let r = 0
  for (const ch of n) r = (r * 10 + +ch) % 97
  return r === 1
}

const digitsOf = (v) => v.replace(/\D/g, '')
const KW = 'password|passwd|pwd|passcode|pin|secret|api[_ -]?key|access[_ -]?token|token'

// Order matters: earlier detectors win when two matches overlap. The loose phone pattern goes last.
const DETECTORS = [
  { type: 'privkey', label: 'Private key', tag: 'PRIVATE KEY', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { type: 'apikey', label: 'API key / token', tag: 'API KEY',
    re: /\b(?:sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})/g },
  { type: 'bearer', label: 'API key / token', tag: 'API KEY', re: /(?<=\bBearer\s+)[A-Za-z0-9._~+/-]{20,}=*/g },
  { type: 'urlsecret', label: 'Secret in URL', tag: 'URL TOKEN',
    re: /(?<=[?&](?:token|access_token|api_?key|key|secret|sig|signature|password)=)[^\s&#"')]+/gi },
  { type: 'credential', label: 'Password / secret', tag: 'PASSWORD',
    re: new RegExp(`(?<=\\b(?:${KW})\\s*(?:is|=|:)\\s*)[^\\s,;"')]+`, 'gi'),
    ok: (v) => v.length >= 4 && /[\d\W_]/.test(v) },
  { type: 'card', label: 'Card number', tag: 'CARD', re: /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g,
    ok: (v) => { const d = digitsOf(v); return d.length >= 13 && d.length <= 19 && luhn(d) } },
  { type: 'aadhaar', label: 'Aadhaar number', tag: 'AADHAAR', re: /(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)/g,
    ok: (v) => verhoeff(digitsOf(v)) },
  { type: 'ssn', label: 'SSN', tag: 'SSN', re: /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g,
    ok: (v) => { const [a, b, c] = v.split('-'); return a !== '000' && a !== '666' && a[0] !== '9' && b !== '00' && c !== '0000' } },
  { type: 'iban', label: 'IBAN', tag: 'IBAN', re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g, ok: ibanOk },
  { type: 'pan', label: 'PAN', tag: 'PAN', re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, ok: (v) => 'PCHFABGJLT'.includes(v[3]) },
  { type: 'email', label: 'Email', tag: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g },
  { type: 'ip', label: 'IP address', tag: 'IP',
    re: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?!\d|\.\d)/g },
  { type: 'dob', label: 'Date of birth', tag: 'DOB',
    re: /(?<=\b(?:dob|d\.o\.b\.?|date of birth|born on|birth ?date)\s*(?:is|:|=|-)?\s*)(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})/gi },
  { type: 'name', label: 'Name', tag: 'NAME',
    re: /(?<=\b(?:[Mm]y (?:full )?name is|[Mm]y name's|I am called|I'm called)\s+)\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+){0,2}/gu },
  { type: 'address', label: 'Address', tag: 'ADDRESS',
    re: /\b\d{1,5}[A-Za-z]?(?:[,\s]+[A-Z][A-Za-z.]*){1,4}[,\s]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Boulevard|Blvd|Nagar|Colony|Marg)\b\.?/g },
  { type: 'phone', label: 'Phone number', tag: 'PHONE', re: /(?<![\w@.])\+?\d[\d ()-]{8,18}\d(?![\w@])/g,
    ok: (v) => {
      const d = digitsOf(v)
      if (d.length < 10 || d.length > 15) return false
      if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(v)) return false // a date, not a phone number
      if (v.split(/\D+/).filter(Boolean).length > 5) return false
      if (/^\d{4} \d{4} \d{4}$/.test(v)) return false // looks like a 12-digit ID, not a phone
      return v.startsWith('+') || /[ ()-]/.test(v) || d.length === 10
    } },
]

// -> [{ start, end, type, label, tag, value }] sorted by position, never overlapping.
export function detectSensitive(text) {
  if (!text || typeof text !== 'string') return []
  const taken = []
  for (const d of DETECTORS) {
    for (const m of text.matchAll(d.re)) {
      const value = m[0]
      if (!value || (d.ok && !d.ok(value))) continue
      const start = m.index, end = start + value.length
      if (taken.some((t) => start < t.end && end > t.start)) continue
      taken.push({ start, end, type: d.type, label: d.label, tag: d.tag, value })
    }
  }
  return taken.sort((a, b) => a.start - b.start)
}

// Splits text into [{ text, span|null }] so React can render <mark> safely (no raw HTML).
export function segmentBySpans(text, spans) {
  const out = []
  let pos = 0
  for (const s of spans) {
    if (s.start > pos) out.push({ text: text.slice(pos, s.start), span: null })
    out.push({ text: text.slice(s.start, s.end), span: s })
    pos = s.end
  }
  if (pos < text.length) out.push({ text: text.slice(pos), span: null })
  return out
}

// Replaces every detected item with a tag such as [EMAIL].
export function redactText(text) {
  if (!text) return text
  let out = text
  for (const s of detectSensitive(text).reverse()) out = out.slice(0, s.start) + `[${s.tag}]` + out.slice(s.end)
  return out
}
