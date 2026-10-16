export default function LoadingSkeleton() {
  return (
    <div className="panel space-y-3 p-6" aria-busy="true">
      <p className="flex items-center gap-3 font-bold"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#38D6E8] border-t-transparent" />Analyzing…</p>
      {[90, 60, 100, 40].map((w, i) => <div key={i} className="skel h-5" style={{ width: w + '%' }} />)}
    </div>
  )
}
