// Service worker: its only job is to make the toolbar icon open the side panel directly
// (no popup). Conversation text never passes through here.
function enableOpenOnClick() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('MIRROR: could not set side panel behavior', e))
}
chrome.runtime.onInstalled.addListener(enableOpenOnClick)
chrome.runtime.onStartup.addListener(enableOpenOnClick)
enableOpenOnClick()
