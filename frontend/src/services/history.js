import { redactText } from '../utils/sensitive.js'

// History lives only in this browser's localStorage (inside the extension it is private to the extension).
// It is NOT encrypted: anyone with access to the browser profile can read it, which is why entries can be redacted or deleted.
const KEY = 'mirror-history'
const MAX = 100
const listeners = new Set()
let cache = null

const read = () => {
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}
export const getHistory = () => (cache ??= read()) // stable reference between changes (needed by useSyncExternalStore)
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const emit = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  // Another tab / side panel changed the history.
  window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) { cache = null; emit() } })
}

function write(items) {
  let list = items.slice(0, MAX)
  for (;;) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); break } catch {
      if (!list.length) return // storage unavailable
      list = list.slice(0, -1) // quota full: drop the oldest entry and retry
    }
  }
  cache = list
  emit()
}

export function addEntry(entry) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  write([{ id, createdAt: Date.now(), ...entry }, ...getHistory()])
  return id
}
export const deleteEntry = (id) => write(getHistory().filter((e) => e.id !== id))
export const clearHistory = () => write([])

// Masks detected private data in every text field of one entry and keeps the entry.
export function redactEntry(id) {
  write(getHistory().map((e) => e.id !== id ? e : {
    ...e,
    title: redactText(e.title),
    prompt: redactText(e.prompt),
    response: redactText(e.response),
    cue: e.cue ? redactText(e.cue) : e.cue,
    counterfactual: e.counterfactual ? { ...e.counterfactual, text: redactText(e.counterfactual.text), prompt: redactText(e.counterfactual.prompt) } : null,
  }))
}
