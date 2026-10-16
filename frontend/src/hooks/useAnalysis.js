import { useRef, useState } from 'react'
import { analyze } from '../services/api.js'
export default function useAnalysis() {
  const [state, setState] = useState({ status: 'idle', result: null, error: null })
  const busy = useRef(false)
  const run = async (input) => {
    if (busy.current) return // prevent duplicate requests
    busy.current = true
    setState(s => ({ ...s, status: 'loading', error: null }))
    try { setState({ status: 'done', result: await analyze(input), error: null }) }
    catch (e) { setState({ status: 'error', result: null, error: e }) }
    finally { busy.current = false }
  }
  return { ...state, run, reset: () => setState({ status: 'idle', result: null, error: null }) }
}
