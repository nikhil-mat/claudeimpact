import PageShell from './PageShell'
import WardDesk from './ward-officer/WardDesk'

// Ward Officer view: "Ward Desk". Sections live in ./ward-officer/ (see its README).
export default function WardOfficerView() {
  return (
    <PageShell title="Ward Officer">
      <WardDesk />
    </PageShell>
  )
}
