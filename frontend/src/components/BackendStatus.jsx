import { useEffect, useState } from 'react'
import { checkHealth } from '../services/api.js'
export default function BackendStatus() {
  const [ok, setOk] = useState(null)
  useEffect(() => { let on = true; const ping = () => checkHealth().then(v => on && setOk(v)); ping(); const id = setInterval(ping, 15000); return () => { on = false; clearInterval(id) } }, [])
  const c = ok === null ? '#999' : ok ? 'var(--green)' : 'var(--red)'
  return <span role="status" className="flex items-center gap-2 text-xs muted"><i className="h-2 w-2 rounded-full" style={{ background: c }} />{ok === null ? 'Checking…' : ok ? 'Backend connected' : 'Backend offline'}</span>
}
