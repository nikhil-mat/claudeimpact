import { clsx } from 'clsx'

type BadgeStatus =
  | 'open'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'escalated'
  | 'tendered'
  | 'awarded'
  | 'completed'
  | 'stalled'
  | 'delayed'

const CONFIG: Record<BadgeStatus, { label: string; classes: string }> = {
  open:         { label: 'Open',         classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  acknowledged: { label: 'Acknowledged', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  assigned:     { label: 'Assigned',     classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress:  { label: 'In Progress',  classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved:     { label: 'Resolved',     classes: 'bg-green-50 text-green-700 border-green-200' },
  escalated:    { label: 'Escalated',    classes: 'bg-red-50 text-red-700 border-red-200' },
  tendered:     { label: 'Tendered',     classes: 'bg-gray-50 text-gray-600 border-gray-200' },
  awarded:      { label: 'Awarded',      classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:    { label: 'Completed',    classes: 'bg-green-50 text-green-700 border-green-200' },
  stalled:      { label: 'Stalled',      classes: 'bg-red-50 text-red-700 border-red-200' },
  delayed:      { label: 'Delayed',      classes: 'bg-amber-50 text-amber-700 border-amber-200' },
}

interface StatusBadgeProps {
  status: BadgeStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = CONFIG[status]
  if (!cfg) return null

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 text-[11px] font-medium border rounded-sm leading-none',
        cfg.classes,
        className
      )}
    >
      {cfg.label}
    </span>
  )
}
