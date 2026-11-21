import { clsx } from 'clsx'

type Severity = 'info' | 'warning' | 'review'

const CONFIG: Record<Severity, { label: string; classes: string }> = {
  info:    { label: 'Info',           classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  warning: { label: 'Warning',       classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  review:  { label: 'Requires Review', classes: 'bg-red-50 text-red-700 border-red-200' },
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const cfg = CONFIG[severity]
  if (!cfg) return null
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 text-[11px] font-medium border rounded-sm leading-none',
      cfg.classes,
      className
    )}>
      {cfg.label}
    </span>
  )
}
