import { clsx } from 'clsx'

interface MetricCardProps {
  label: string
  value?: string
  subtext?: string
  accent?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  subtext,
  accent,
  className,
}: MetricCardProps) {
  return (
    <div
      className={clsx('border border-edge p-4', className)}
      style={
        accent
          ? { borderLeftWidth: '2px', borderLeftColor: accent }
          : undefined
      }
    >
      <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-ink-faint leading-none">
        {label}
      </p>
      {value ? (
        <p className="text-2xl font-bold font-mono text-ink mt-1.5 leading-none">
          {value}
        </p>
      ) : (
        <div className="h-7 w-20 bg-surface-muted rounded-sm mt-1.5 animate-pulse" />
      )}
      {subtext && (
        <p className="text-xs text-ink-faint mt-1.5 leading-none">{subtext}</p>
      )}
    </div>
  )
}
