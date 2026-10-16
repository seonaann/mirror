// MIRROR content script. It is passive: it never reads, stores or sends anything on its own and
// does not change the page. It answers one message from this extension's side panel:
//   { type: 'MIRROR_GET_TURNS' } -> { ok, site, turns: [{ id, prompt, response, streaming }] }
// Capture happens only when the user clicks "Read from ChatGPT/Claude" in the side panel.
//
// SELECTORS DEPEND ON CHATGPT'S / CLAUDE'S CURRENT MARKUP AND WILL NEED UPDATING WHEN THEY CHANGE.
// They could not be tested against the live sites when this file was written.
;(() => {
  if (window.__mirrorCaptureLoaded) return
  window.__mirrorCaptureLoaded = true

  const SITES = {
    'chatgpt.com': {
      id: 'chatgpt',
      user: ['[data-message-author-role="user"]'],
      assistant: ['[data-message-author-role="assistant"]'],
      // Text container inside an assistant message (falls back to the message itself).
      body: ['.markdown'],
      streaming: (el) =>
        !!el.querySelector('.result-streaming') ||
        // The stop button is only present while a reply is being generated.
        (!!document.querySelector('[data-testid="stop-button"]') && isLastAssistant(el)),
    },
    'claude.ai': {
      id: 'claude',
      user: ['[data-testid="user-message"]'],
      assistant: ['[data-testid="assistant-message"]', '.font-claude-response', '.font-claude-message'],
      body: [],
      streaming: (el) => !!el.closest('[data-is-streaming="true"]') || !!el.querySelector('[data-is-streaming="true"]'),
    },
  }

  const site = SITES[location.hostname]
  const MAX_CHARS = 20000 // sanity cap per message

  function isLastAssistant(el) {
    const all = document.querySelectorAll(site.assistant.join(','))
    return all.length > 0 && all[all.length - 1] === el
  }

  // Drop elements nested inside another matched element so one message is never counted twice.
  function outermost(nodes) {
    return nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)))
  }

  function textOf(el, bodySelectors) {
    let node = el
    for (const sel of bodySelectors) {
      const inner = el.querySelector(sel)
      if (inner) { node = inner; break }
    }
    return (node.innerText || node.textContent || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_CHARS)
  }

  function collectTurns() {
    const selector = [...site.user, ...site.assistant].join(',')
    const nodes = outermost(Array.from(document.querySelectorAll(selector)))
    const isUser = (n) => site.user.some((s) => n.matches(s))
    const turns = []
    let pendingPrompt = ''
    nodes.forEach((n, i) => {
      if (isUser(n)) {
        pendingPrompt = textOf(n, [])
        return
      }
      const response = textOf(n, site.body)
      if (!response) return
      turns.push({
        // Stable across re-captures when the site exposes a message id, otherwise positional.
        id: n.getAttribute('data-message-id') || `pos-${i}`,
        prompt: pendingPrompt,
        response,
        streaming: !!site.streaming(n),
      })
    })
    return turns
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return // ignore anything not from this extension
    if (!msg || msg.type !== 'MIRROR_GET_TURNS') return
    if (!site) { sendResponse({ ok: false, error: 'unsupported' }); return }
    try {
      sendResponse({ ok: true, site: site.id, turns: collectTurns() })
    } catch (e) {
      sendResponse({ ok: false, error: 'failed', detail: String(e && e.message || e) })
    }
  })
})()
