import { RefreshCw, WifiOff } from 'lucide-react'
const copy = { connection: 'Is the server running?', timeout: 'Try again in a moment.', invalid: 'Check that the backend version matches this app.', server: 'The backend hit an error. Check its logs.' }
export default function ErrorMessage({ error, onRetry }) {
  return (
    <div role="alert" className="panel flex flex-col items-center gap-3 p-10 text-center">
      <WifiOff className="text-[#DC5555]" size={36} />
      <h2 className="text-lg font-bold">{error.message}</h2>
      <p className="muted text-sm">{copy[error.kind] || copy.server}</p>
      <button className="btn" onClick={onRetry}><RefreshCw size={16} />Retry</button>
    </div>
  )
}
