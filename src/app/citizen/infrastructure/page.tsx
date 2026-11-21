import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { MetricCard } from '@/components/ui/MetricCard'
import { loadFloodHotspots, loadRoads, loadFacilities, loadWards } from '@/lib/data/loader'

export default function InfrastructurePage() {
  const floodHotspots = loadFloodHotspots()
  const roads = loadRoads()
  const facilities = loadFacilities()
  const wards = loadWards()

  const hospitals = facilities.filter(f => f.type === 'Hospital')
  const schools = facilities.filter(f => f.type === 'School')
  const dlpRoads = roads.filter(r => r.under_dlp)
  const busRouteRoads = roads.filter(r => r.bus_route)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Infrastructure Data"
        description="Flood hotspots, road network, and critical facilities across Mumbai's wards"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <MetricCard label="Total Roads" value={roads.length.toString()} accent="#1565C0" />
        <MetricCard label="Under DLP" value={dlpRoads.length.toString()} accent="#C4320A" />
        <MetricCard label="Bus Routes" value={busRouteRoads.length.toString()} accent="#1565C0" />
        <MetricCard label="Flood Hotspots" value={floodHotspots.length.toString()} accent="#C4320A" />
        <MetricCard label="Hospitals" value={hospitals.length.toString()} accent="#2E7D32" />
        <MetricCard label="Schools" value={schools.length.toString()} accent="#2E7D32" />
      </div>

      {/* Flood Hotspots */}
      <section className="border border-edge mb-6">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Flood Hotspots ({floodHotspots.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt border-b border-edge">
                {['Name', 'Ward', 'Threshold', 'Tide Sensitive', 'Avg Depth', 'Recession', 'Pump', 'Years Flagged'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {floodHotspots.map(h => (
                <tr key={h.hotspot_id} className="border-b border-edge last:border-b-0 hover:bg-surface-alt/50">
                  <td className="px-3 py-2 text-xs font-medium">{h.name}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.ward_code}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.flood_threshold_mm_per_day}mm</td>
                  <td className="px-3 py-2 text-xs">{h.tide_sensitive ? '✓ Yes' : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.avg_water_depth_cm}cm</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.avg_recession_hours}h</td>
                  <td className="px-3 py-2 text-xs">{h.pumping_station_nearby ? '✓' : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.years_flagged_last_5}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Hospitals ({hospitals.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge">
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Ward</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Beds</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Emergency</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map(f => (
                  <tr key={f.facility_id} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-1.5">{f.name}</td>
                    <td className="px-3 py-1.5 font-mono">{f.ward_code}</td>
                    <td className="px-3 py-1.5 font-mono">{f.beds_or_students}</td>
                    <td className="px-3 py-1.5">{f.emergency_services ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Schools ({schools.length})
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge sticky top-0 bg-surface">
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Ward</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Students</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(f => (
                  <tr key={f.facility_id} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-1.5">{f.name}</td>
                    <td className="px-3 py-1.5 font-mono">{f.ward_code}</td>
                    <td className="px-3 py-1.5 font-mono">{f.beds_or_students.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Roads under DLP */}
      <section className="border border-edge">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Roads Under Defect Liability Period ({dlpRoads.length})
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-edge sticky top-0 bg-surface">
                <th className="px-3 py-2 text-left font-semibold text-ink-faint">Road</th>
                <th className="px-3 py-2 text-left font-semibold text-ink-faint">Ward</th>
                <th className="px-3 py-2 text-left font-semibold text-ink-faint">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-ink-faint">Surface</th>
                <th className="px-3 py-2 text-left font-semibold text-ink-faint">Last Resurfaced</th>
              </tr>
            </thead>
            <tbody>
              {dlpRoads.map(r => (
                <tr key={r.road_id} className="border-b border-edge last:border-b-0">
                  <td className="px-3 py-1.5">{r.road_name}</td>
                  <td className="px-3 py-1.5 font-mono">{r.ward_code}</td>
                  <td className="px-3 py-1.5">{r.road_type}</td>
                  <td className="px-3 py-1.5">{r.surface}</td>
                  <td className="px-3 py-1.5 font-mono">{r.last_resurfaced}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
