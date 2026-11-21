import { AlertTriangle } from 'lucide-react'

export function DisclaimerBanner({ className }: { className?: string }) {
  return (
    <div className={`bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2.5 ${className || ''}`}>
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.8} />
      <p className="text-[11px] text-amber-800 leading-relaxed">
        <span className="font-semibold uppercase tracking-[0.04em]">Simulated Data</span>
        {' · '}
        All figures shown are from a synthetic challenge dataset, not verified BMC records.
        Dataset licensed CC BY 4.0 from Claude Impact Labs.
      </p>
    </div>
  )
}
