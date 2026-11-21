import Link from 'next/link'
import type { RoleConfig } from '@/config/roles'

export function RoleCard({ role }: { role: RoleConfig }) {
  const Icon = role.icon

  return (
    <Link
      href={role.path}
      className="group block border border-edge bg-surface hover:bg-surface-alt transition-colors duration-150"
      style={{ borderLeftWidth: '3px', borderLeftColor: role.accent }}
    >
      <div className="p-5 sm:p-6">
        {/* Role header */}
        <div className="flex items-center gap-2.5 mb-3">
          <Icon
            className="w-4 h-4 shrink-0"
            style={{ color: role.accent }}
            strokeWidth={1.8}
          />
          <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-ink">
            {role.name}
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-ink-light leading-relaxed mb-4">
          {role.description}
        </p>

        {/* Capabilities */}
        <ul className="space-y-1.5 mb-5">
          {role.capabilities.map((cap) => (
            <li
              key={cap}
              className="text-xs text-ink-light flex items-start gap-2 leading-relaxed"
            >
              <span className="text-ink-faint mt-px select-none">›</span>
              <span>{cap}</span>
            </li>
          ))}
        </ul>

        {/* Enter link */}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-faint group-hover:text-ink transition-colors duration-150">
          Enter
          <svg
            className="w-3.5 h-3.5 translate-x-0 group-hover:translate-x-0.5 transition-transform duration-150"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </span>
      </div>
    </Link>
  )
}
