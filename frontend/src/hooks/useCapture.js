import { useCallback, useEffect, useRef, useState } from 'react'
import { isExtension, watchActiveTab, captureTurns, CaptureError } from '../services/capture.js'

const EMPTY = { status: 'idle', turns: [], selectedId: null, error: null } // idle | loading | ready | error

export default function useCapture() {
  const [tab, setTab] = useState({ tabId: null, url: '', site: null })
  const [state, setState] = useState(EMPTY)
  const lastKey = useRef(null)

  useEffect(() => {
    if (!isExtension) return
    return watchActiveTab((next) => {
      // Switching tab or navigating to another conversation invalidates anything captured earlier: drop it from memory.
      const key = `${next.tabId}|${next.url}`
      if (lastKey.current !== key) setState(EMPTY)
      lastKey.current = key
      setTab(next)
    })
  }, [])

  // Returns the turn to fill the form with (or null on failure). `keepId` preserves the selection on refresh.
  const read = useCallback(async (keepId) => {
    if (!tab.tabId || !tab.site) return null
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const turns = await captureTurns(tab.tabId)
      const chosen = turns.find((t) => t.id === keepId) || turns[turns.length - 1]
      setState({ status: 'ready', turns, selectedId: chosen.id, error: null })
      return chosen
    } catch (e) {
      const error = e instanceof CaptureError ? e : new CaptureError('failed', 'Capture failed.')
      setState({ status: 'error', turns: [], selectedId: null, error })
      return null
    }
  }, [tab])

  const select = useCallback((id) => {
    setState((s) => ({ ...s, selectedId: id }))
  }, [])

  return { ...state, site: tab.site, supported: !!tab.site, read, select }
}
