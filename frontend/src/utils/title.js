import { redactText } from './sensitive.js'

// Short chat-style title from the prompt (or the response when there is no prompt). Done locally: no text leaves the browser.
// Private data is masked first so a title in the list can never expose it.
export function makeTitle(prompt, response, maxWords = 7) {
  let t = (prompt || '').trim() || (response || '').trim()
  t = t.replace(/```[\s\S]*?```/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_`>~|]/g, '').replace(/[ \t]+/g, ' ').trim()
  t = (t.split(/(?<=[.!?])\s+|\n/)[0] || '').trim()
  t = redactText(t)
  t = t.replace(/^(?:(?:hey|hi|hello|please|kindly|can you|could you|would you|can i|i want to|i need to|i would like to)\b[,\s]*)+/i, '')
  t = t.replace(/[\s.,;:!?-]+$/, '')
  const words = t.split(/\s+/).filter(Boolean).slice(0, maxWords)
  if (!words.length) return 'Untitled analysis'
  const title = words.join(' ')
  return title[0].toUpperCase() + title.slice(1)
}
