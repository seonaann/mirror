import { AlertTriangle, CheckCircle2 } from 'lucide-react'
export default function BiasBanner({ label, biased }) {
  const Icon = biased ? AlertTriangle : CheckCircle2
  return <div role="status" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: biased ? 'rgba(220,85,85,.25)' : 'rgba(54,168,121,.25)' }}>
    <Icon size={18} />{biased ? `Potential bias detected: ${label.replace('_', ' ')}` : 'No assumption detected'}</div>
}
