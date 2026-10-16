export default function ConfidenceMeter({ value }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex justify-between text-sm font-semibold"><span>Confidence</span><span>{pct}%</span></div>
      <div role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Model confidence" className="mt-1 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#38D6E8]" style={{ width: pct + '%' }} />
      </div>
      <p className="muted mt-1 text-xs">Model confidence, not proof of bias</p>
    </div>
  )
}
