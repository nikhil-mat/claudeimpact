import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-surface-muted rounded-sm',
        className ?? 'h-4 w-full'
      )}
    />
  )
}

/** Multiple skeleton lines for simulating text blocks. */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-3.5', i === count - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  )
}
