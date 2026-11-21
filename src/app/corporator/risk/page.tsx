import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { MetricCard } from '@/components/ui/MetricCard'
import {
  loadFloodHotspots, loadRainfall, loadTides, loadTraffic,
  loadAccidents, loadFacilities, loadRoads, loadWards,
} from '@/lib/data/loader'

export default function RiskPage() {
  const floodHotspots = loadFloodHotspots()
  const rainfall = loadRainfall()
  const tides = loadTides()
  const traffic = loadTraffic()
  const accidents = loadAccidents()
  const facilities = loadFacilities()
  const roads = loadRoads()
  const wards = loadWards()

  const heavyRainDays = rainfall.filter(r => r.rainfall_mm >= 65).length
  const bigTides = tides.filter(t => t.big_tide_flag).length
  const highCongestion = traffic.filter(t => t.congestion_index_0_10 >= 7).length
  const fatalAccidents = accidents.filter(a => a.severity === 'Fatal').length
  const hospitals = facilities.filter(f => f.type === 'Hospital')
  const schools = facilities.filter(f => f.type === 'School')
  const dlpRoads = roads.filter(r => r.under_dlp)

  // Accidents by ward
  const accByWard: Record<string, number> = {}
  for (const a of accidents) {
    accByWard[a.ward_code] = (accByWard[a.ward_code] || 0) + 1
  }

  // Hotspots by ward
  const hsByWard: Record<string, typeof floodHotspots> = {}
  for (const h of floodHotspots) {
    if (!hsByWard[h.ward_code]) hsByWard[h.ward_code] = []
    hsByWard[h.ward_code].push(h)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Infrastructure Risk Overview"
        description="Flood hotspots, rainfall, tides, traffic congestion, accidents, and critical facilities"
      />

      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <MetricCard label="Flood Hotspots" value={floodHotspots.length.toString()} accent="#C4320A" />
        <MetricCard label="Heavy Rain Days" value={heavyRainDays.toString()} subtext="≥65mm" accent="#1565C0" />
        <MetricCard label="Big Tides" value={bigTides.toString()} accent="#1565C0" />
        <MetricCard label="High Congestion" value={highCongestion.toString()} subtext="Index ≥7" accent="#D4760A" />
        <MetricCard label="Accidents" value={accidents.length.toString()} subtext={`${fatalAccidents} fatal`} accent="#C4320A" />
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
                {['Name', 'Ward', 'Threshold (mm)', 'Tide Sensitive', 'Avg Depth (cm)', 'Recession (hrs)', 'Pump Nearby', 'Years Flagged'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {floodHotspots.map(h => (
                <tr key={h.hotspot_id} className="border-b border-edge last:border-b-0 hover:bg-surface-alt/50">
                  <td className="px-3 py-2 text-xs font-medium">{h.name}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.ward_code}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.flood_threshold_mm_per_day}</td>
                  <td className="px-3 py-2 text-xs">{h.tide_sensitive ? '✓' : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.avg_water_depth_cm}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.avg_recession_hours}</td>
                  <td className="px-3 py-2 text-xs">{h.pumping_station_nearby ? '✓' : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono">{h.years_flagged_last_5}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top congested roads */}
      <section className="border border-edge mb-6">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Most Congested Roads (Top 20)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt border-b border-edge">
                {['Road', 'Congestion', 'Peak Vehicles', 'Peak Speed', 'Bus Routes', '2W Share'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...traffic].sort((a, b) => b.congestion_index_0_10 - a.congestion_index_0_10).slice(0, 20).map(t => {
                const road = roads.find(r => r.road_id === t.road_id)
                return (
                  <tr key={t.road_id} className="border-b border-edge last:border-b-0 hover:bg-surface-alt/50">
                    <td className="px-3 py-2 text-xs">{road?.road_name || t.road_id}</td>
                    <td className="px-3 py-2 text-xs font-mono">
                      <span className={t.congestion_index_0_10 >= 8 ? 'text-flag font-semibold' : t.congestion_index_0_10 >= 6 ? 'text-progress' : ''}>
                        {t.congestion_index_0_10}/10
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{t.peak_hour_vehicles.toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs font-mono">{t.avg_peak_speed_kmph} km/h</td>
                    <td className="px-3 py-2 text-xs font-mono">{t.bus_routes_count}</td>
                    <td className="px-3 py-2 text-xs font-mono">{t.two_wheeler_share_pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Accidents by severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Accidents by Ward (Top 10)
            </h2>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Ward</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Accidents</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(accByWard).sort(([,a], [,b]) => b - a).slice(0, 10).map(([wc, count]) => (
                  <tr key={wc} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 text-xs font-mono">{wc}</td>
                    <td className="px-3 py-2 text-xs font-mono">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Critical Facilities ({facilities.length} total)
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Hospitals</p>
                <p className="text-xl font-bold font-mono text-ink mt-0.5">{hospitals.length}</p>
                <p className="text-[11px] text-ink-faint">{hospitals.filter(h => h.emergency_services).length} with emergency services</p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Schools</p>
                <p className="text-xl font-bold font-mono text-ink mt-0.5">{schools.length}</p>
                <p className="text-[11px] text-ink-faint">{schools.reduce((s, sc) => s + sc.beds_or_students, 0).toLocaleString()} total students</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint mb-2">Roads Under DLP</p>
              <p className="text-xl font-bold font-mono text-flag">{dlpRoads.length}</p>
              <p className="text-[11px] text-ink-faint mt-0.5">Roads under Defect Liability Period — repairs should be at contractor's cost</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
