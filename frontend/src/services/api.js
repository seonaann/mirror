// ASSUMED backend contract — adjust paths/fields to match backend/ (I could not inspect it):
//   GET  /health   -> 200
//   POST /analyze  {prompt, response} -> {label, confidence, probabilities:{label:p}, cue, counterfactual?:{text, prompt?, still_biased?, similarity?, drift?}}
export const LABELS = ['gender', 'caregiver_role', 'decision_authority', 'socioeconomic_class', 'none']
export const getSettings = () => {
  const def = { baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', threshold: 0.5 }
  try { return { ...def, ...JSON.parse(localStorage.getItem('mirror-settings') || '{}') } } catch { return def }
}
export const saveSettings = (s) => localStorage.setItem('mirror-settings', JSON.stringify(s))

export class ApiError extends Error {
  constructor(kind, message) { super(message); this.kind = kind } // connection | timeout | invalid | server
}
async function request(path, options = {}, timeout = 30000) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(getSettings().baseUrl + path, { ...options, signal: ctrl.signal, headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new ApiError('server', `Server returned ${res.status}.`)
    try { return await res.json() } catch { throw new ApiError('invalid', 'The server sent an unreadable response.') }
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (e.name === 'AbortError') throw new ApiError('timeout', 'The server took too long to respond.')
    throw new ApiError('connection', `Can't reach MIRROR at ${getSettings().baseUrl}.`)
  } finally { clearTimeout(t) }
}
export const checkHealth = (baseUrl) =>
  fetch((baseUrl || getSettings().baseUrl) + '/health').then(r => r.ok).catch(() => false)

export async function analyze({ response, prompt }) {
  const d = await request('/analyze', { method: 'POST', body: JSON.stringify({ response, prompt: prompt || null }) })
  if (!d || typeof d.label !== 'string' || typeof d.confidence !== 'number' || !d.probabilities)
    throw new ApiError('invalid', 'The response is missing label, confidence or probabilities.')
  return d
}
