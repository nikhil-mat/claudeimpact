import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ROLES } from '@/config/roles'

const role = ROLES[0] // Citizen

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar
        roleName={role.name}
        accent={role.accent}
        basePath={role.path}
        navItems={role.navItems}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
