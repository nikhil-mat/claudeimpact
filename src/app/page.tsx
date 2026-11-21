import { RoleCard } from '@/components/landing/RoleCard'
import { ROLES } from '@/config/roles'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-edge px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <span className="text-[13px] font-semibold tracking-[0.12em] uppercase text-ink">
            MonsoonWatch
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="max-w-xl mb-10 sm:mb-12">
            <h1 className="text-2xl sm:text-[32px] font-bold text-ink leading-tight tracking-tight">
              Civic Infrastructure Intelligence
            </h1>
            <p className="text-base sm:text-lg text-ink-light mt-1">Mumbai</p>
            <p className="text-sm text-ink-light leading-relaxed mt-4">
              An independent platform for investigating public infrastructure
              spending, tracking civic complaints, and supporting evidence-based
              accountability across Mumbai&apos;s 24 administrative wards.
            </p>
          </div>

          {/* Role selector */}
          <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-faint mb-3">
            Select your role to continue
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {ROLES.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      </main>

      {/* Disclaimer */}
      <footer className="border-t border-edge px-4 sm:px-6 py-4 bg-surface-alt">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] text-ink-faint leading-relaxed">
            <span className="font-semibold tracking-[0.04em] uppercase">
              Demonstration platform
            </span>
            {' · '}
            Uses illustrative data for hackathon purposes. Not affiliated with
            the Brihanmumbai Municipal Corporation or any government body.
          </p>
        </div>
      </footer>
    </div>
  )
}
