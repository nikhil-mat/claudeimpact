import type { ReactNode } from 'react'

// Shared wrapper for every view: header with back link + content area.
export default function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page">
      <header className="page-header">
        <a href="#/" className="back-link">← Gateway</a>
        <h1>{title} view</h1>
      </header>
      <main>{children}</main>
    </div>
  )
}
