export function Footer() {
  return (
    <footer className="border-t border-edge px-4 sm:px-6 py-3 bg-surface-alt">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
        <p className="text-xs text-ink-faint">
          <span className="font-semibold tracking-wide">MonsoonWatch</span>
          <span className="hidden sm:inline"> · Civic Infrastructure Intelligence</span>
        </p>
        <p className="text-xs text-ink-faint">
          Illustrative data · Not affiliated with any government body
        </p>
      </div>
    </footer>
  )
}
