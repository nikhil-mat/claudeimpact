import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-ink text-white hover:bg-ink-light': variant === 'primary',
          'border border-edge text-ink hover:bg-surface-alt':
            variant === 'secondary',
          'text-ink-light hover:text-ink hover:bg-surface-alt':
            variant === 'ghost',
        },
        {
          'text-xs px-3 py-1.5 tracking-wide': size === 'sm',
          'text-sm px-4 py-2': size === 'md',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
