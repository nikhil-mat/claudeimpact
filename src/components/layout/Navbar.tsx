'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Menu, X, ArrowLeft } from 'lucide-react'
import type { NavItem } from '@/config/roles'

interface NavbarProps {
  roleName: string
  accent: string
  basePath: string
  navItems: NavItem[]
}

export function Navbar({ roleName, accent, basePath, navItems }: NavbarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(itemPath: string): boolean {
    if (itemPath === basePath) return pathname === basePath
    return pathname === itemPath || pathname.startsWith(itemPath + '/')
  }

  return (
    <header className="border-b border-edge bg-surface sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          {/* Brand + Role identifier */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-ink-faint hover:text-ink transition-colors shrink-0"
              title="Back to role selection"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
            </Link>
            <Link
              href="/"
              className="text-[13px] font-semibold tracking-[0.1em] uppercase text-ink hover:text-ink-light transition-colors shrink-0"
            >
              MonsoonWatch
            </Link>
            <span className="text-ink-faint select-none hidden sm:inline">·</span>
            <span
              className="text-xs font-medium tracking-[0.06em] uppercase truncate hidden sm:inline"
              style={{ color: accent }}
            >
              {roleName}
            </span>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    'relative px-3 py-3.5 text-xs font-medium tracking-wide transition-colors',
                    active
                      ? 'text-ink'
                      : 'text-ink-light hover:text-ink'
                  )}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[2px]"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5 -mr-1.5 text-ink-light hover:text-ink transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" strokeWidth={1.5} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-edge bg-surface px-4 sm:px-6 py-1">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'block py-2.5 text-sm font-medium transition-colors',
                  active ? 'text-ink' : 'text-ink-light'
                )}
                style={active ? { color: accent } : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
