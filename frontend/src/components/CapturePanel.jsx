import { RefreshCw, Download } from 'lucide-react'
import useCapture from '../hooks/useCapture.js'
import { isExtension } from '../services/capture.js'

const preview = (t, n = 90) => (t.length > n ? t.slice(0, n).trimEnd() + '…' : t)
const HINT = {
  'no-receiver': 'The page was opened before MIRROR was installed or reloaded. Reload the ChatGPT/Claude tab, then try again.',
  empty: 'Open a conversation that has at least one AI reply, then try again.',
  unsupported: 'This page is not supported.',
  failed: 'MIRROR could not read this page. Its layout may have changed. You can still paste text below.',
}

// Mode B (capture). Renders nothing on the normal website. Nothing is read until the user clicks the button,
// and nothing is analysed until the user clicks Analyze in the form below.
export default function CapturePanel({ onUse, disabled }) {
  const { status, turns, selectedId, error, site, supported, read, select } = useCapture()
  if (!isExtension) return null

  const loading = status === 'loading'
  const readNow = async (keep) => { const t = await read(keep); if (t) onUse(t) }
  const pick = (t) => { select(t.id); onUse(t) }

  return (
    <section className="panel space-y-3 p-6" aria-label="Read from the current tab">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Read from the page</h2>
        {status === 'ready' && (
          <button className="btn btn-ghost !px-3 !py-1.5 text-sm" disabled={disabled || loading} onClick={() => readNow(selectedId)}>
            <RefreshCw size={14} />Refresh
          </button>
        )}
      </div>

      {!supported ? (
        <p role="status" className="muted text-sm">Open a conversation on chatgpt.com or claude.ai to read it here. You can always paste text below instead.</p>
      ) : (
        <>
          <button className="btn w-full" disabled={disabled || loading} onClick={() => readNow(null)}>
            <Download size={16} />{loading ? 'Reading…' : `Read from ${site.name}`}
          </button>
          <p className="muted text-xs">Only this tab is read, only when you click. Nothing is sent for analysis until you press Analyze.</p>
        </>
      )}

      {status === 'error' && (
        <div role="alert" className="rounded-xl bg-[#DC5555]/20 p-3 text-sm">
          <b>{error.message}</b>
          <div className="muted mt-1 text-xs">{HINT[error.kind] || HINT.failed}</div>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-2">
          <p role="status" className="text-sm" style={{ color: 'var(--green)' }}>
            Filled the fields below. Review and edit before analyzing, or pick a different reply.
          </p>
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1" aria-label="Conversation replies, newest first">
            {[...turns].reverse().map((t) => {
              const on = t.id === selectedId
              return (
                <li key={t.id}>
                  <button type="button" aria-pressed={on} disabled={disabled} onClick={() => pick(t)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${on ? 'border-[#38D6E8] bg-[#38D6E8]/15' : 'border-white/15 hover:bg-white/5'}`}>
                    {t.prompt && <div className="muted text-xs">You: {preview(t.prompt, 70)}</div>}
                    <div>{preview(t.response)}</div>
                    {t.streaming && <div className="mt-1 text-xs text-[#DC5555]">Still generating. Refresh when it finishes.</div>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
