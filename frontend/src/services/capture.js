// Talks to the extension's content script. Only meaningful inside the Chrome side panel;
// on the normal website `isExtension` is false and none of this is used.
export const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.tabs

const SITES = [
  { id: 'chatgpt', name: 'ChatGPT', host: 'chatgpt.com' },
  { id: 'claude', name: 'Claude', host: 'claude.ai' },
]

export class CaptureError extends Error {
  constructor(kind, message) { super(message); this.kind = kind } // unsupported | no-receiver | empty | failed
}

export const siteFromUrl = (url) => {
  try { const h = new URL(url).hostname; return SITES.find((s) => s.host === h) || null } catch { return null }
}

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return { tabId: tab?.id ?? null, url: tab?.url || '', site: siteFromUrl(tab?.url) }
}

// Calls `onChange({tabId, site})` whenever the user switches tabs or the active tab navigates.
// Returns an unsubscribe function. Never reads page content.
export function watchActiveTab(onChange) {
  const refresh = () => getActiveTab().then(onChange).catch(() => onChange({ tabId: null, url: '', site: null }))
  const onUpdated = (_id, info, tab) => { if (tab.active && (info.url || info.status === 'complete')) refresh() }
  chrome.tabs.onActivated.addListener(refresh)
  chrome.tabs.onUpdated.addListener(onUpdated)
  refresh()
  return () => { chrome.tabs.onActivated.removeListener(refresh); chrome.tabs.onUpdated.removeListener(onUpdated) }
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new CaptureError('failed', 'The page did not respond.')), ms))])

// Explicit, user-initiated read of the conversation on `tabId`.
export async function captureTurns(tabId) {
  let reply
  try {
    reply = await withTimeout(chrome.tabs.sendMessage(tabId, { type: 'MIRROR_GET_TURNS' }), 6000)
  } catch (e) {
    if (e instanceof CaptureError) throw e
    throw new CaptureError('no-receiver', 'Could not reach the page. Reload the tab and try again.')
  }
  if (!reply?.ok) throw new CaptureError(reply?.error === 'unsupported' ? 'unsupported' : 'failed', 'Reading the page failed.')
  if (!reply.turns.length) throw new CaptureError('empty', 'No assistant reply found on this page.')
  return reply.turns
}
