import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AccidentsFile, Complaint, GeoFile, WardSummary, WorkOrder } from './types.ts'
import { useJson } from './data.ts'
import { EvidenceDrawer, SourceChip } from './Evidence.tsx'
import { formatInr } from './format.ts'
import './map.css'

// Ward map on real map tiles (Leaflet). Same data and layers as before; the ward outline is
// clipped to land and the few complaints whose synthetic point falls in the sea are drawn on the
// shore (public/data/land.json).
type LandFile = {
  wards: Record<string, GeoJSON.Polygon | GeoJSON.MultiPolygon>
  moved: Record<string, [number, number]>
}

const LAYERS = ['Hotspots', 'Hospitals', 'Schools', 'Road accidents', 'Open complaints'] as const
type Layer = (typeof LAYERS)[number]
const WIDTHS = [3, 4.5, 7.5, 10.5]
const RAMP = ['--f-rule', '--f-amber', '--f-red', '--f-red']
const RAMP_OPACITY = [1, 1, 0.7, 1]
const INK = 'var(--f-ink)'
const RED = 'var(--f-red)'
const VIOLET = 'var(--f-stamp)'
const SHEET = 'var(--f-sheet)'
const dark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
const esri = (kind: 'Base' | 'Reference', d: boolean) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${d ? 'Dark' : 'Light'}_Gray_${kind}/MapServer/tile/{z}/{y}/{x}`

const mk = (children: ReactNode) => (
  <svg className="mk" viewBox="0 0 14 14" aria-hidden="true">{children}</svg>
)
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
// map markers as small inline SVGs; CSS variables work in style="", not in SVG attributes
const icon = (svg: string, size: number) =>
  L.divIcon({ className: 'cv-mk', html: svg, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
const triangle = (tide: boolean) =>
  icon(`<svg viewBox="0 0 20 20"><polygon points="1,17.5 19,17.5 10,1.5" style="fill:${tide ? SHEET : INK};stroke:${INK};stroke-width:${tide ? 2.5 : 1};stroke-linejoin:round"/></svg>`, 20)
const square = (hospital: boolean) =>
  icon(`<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="1.5" style="fill:${hospital ? INK : SHEET};stroke:${INK};stroke-width:1.5"/></svg>`, 16)
const cross = () =>
  icon(`<svg viewBox="0 0 14 14"><g style="stroke:${RED};stroke-width:2.5;stroke-linecap:round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="2" y1="12" x2="12" y2="2"/></g></svg>`, 14)

export default function WardMap({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] }) {
  const geo = useJson<GeoFile>('geo.json')
  const comp = useJson<Complaint[]>('complaints.json')
  const acc = useJson<AccidentsFile>('accidents.json')
  const land = useJson<LandFile>('land.json')
  const [on, setOn] = useState<Record<Layer, boolean>>({
    Hotspots: true, Hospitals: true, Schools: false, 'Road accidents': true, 'Open complaints': true,
  })
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const groupRef = useRef<L.LayerGroup | null>(null)

  const code = ward.ward_code
  const ready = Boolean(geo.data && comp.data && acc.data)
  const gw = geo.data?.wards.find((w) => w.ward_code === code)
  const roads = geo.data?.roads.filter((r) => r.ward === code) ?? []
  const hotspots = geo.data?.hotspots.filter((h) => h.ward === code) ?? []
  const fac = geo.data?.facilities.filter((f) => f.ward === code) ?? []
  const accidents = acc.data?.rows.filter((a) => a.ward === code && a.road_caused) ?? []
  const complaints = comp.data?.filter((c) => c.ward === code && c.is_open && c.lat != null && c.lon != null) ?? []

  const failBy = new Map<string, { road_id: string; road_name: string; failed_inr: number }>()
  for (const w of workOrders) {
    const r = failBy.get(w.road_id) ?? { road_id: w.road_id, road_name: w.road_name, failed_inr: 0 }
    r.failed_inr += w.b_fail
    failBy.set(w.road_id, r)
  }
  const failRows = [...failBy.values()].filter((r) => r.failed_inr > 0).sort((a, b) => b.failed_inr - a.failed_inr)
  const sorted = failRows.map((r) => r.failed_inr).sort((a, b) => a - b)
  const t1 = sorted[Math.floor(sorted.length / 3)] ?? 0
  const t2 = sorted[Math.floor((2 * sorted.length) / 3)] ?? 0
  const tier = (v: number) => (v <= 0 ? 0 : v < t1 ? 1 : v < t2 ? 2 : 3)
  const counts: Record<Layer, number> = {
    Hotspots: hotspots.length,
    Hospitals: fac.filter((f) => f.type === 'Hospital').length,
    Schools: fac.filter((f) => f.type !== 'Hospital').length,
    'Road accidents': accidents.length,
    'Open complaints': complaints.length,
  }

  // create the map once the data is in and the box exists
  useEffect(() => {
    if (!ready || !box.current || mapRef.current) return
    const d = dark()
    const map = L.map(box.current, { scrollWheelZoom: false })
    L.tileLayer(esri('Base', d), { attribution: 'Tiles © Esri', maxZoom: 16 }).addTo(map)
    map.createPane('labels')
    map.getPane('labels')!.style.zIndex = '450'
    map.getPane('labels')!.style.pointerEvents = 'none'
    L.tileLayer(esri('Reference', d), { pane: 'labels', maxZoom: 16, opacity: 0.8 }).addTo(map)
    map.on('click', () => map.scrollWheelZoom.enable()) // scroll-zoom only after a click, so the page still scrolls
    map.on('mouseout', () => map.scrollWheelZoom.disable())
    mapRef.current = map
    groupRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      groupRef.current = null
    }
  }, [ready])

  // redraw the ward's layers whenever the ward, data or toggles change
  useEffect(() => {
    const map = mapRef.current, group = groupRef.current
    if (!map || !group || !gw || !box.current) return
    group.clearLayers()
    const css = getComputedStyle(box.current)
    const v = (name: string) => css.getPropertyValue(name).trim() || '#999'

    const outline = land.data?.wards[code]
    const wardLayer: L.Polygon | L.GeoJSON = outline
      ? L.geoJSON(outline, { style: { color: v('--f-ink-2'), weight: 2, fillColor: v('--f-sheet-2'), fillOpacity: 0.25 }, interactive: false })
      : L.polygon(gw.rings.map((ring) => ring.map(([lo, la]) => [la, lo] as [number, number])), { color: v('--f-ink-2'), weight: 2, fillOpacity: 0.1, interactive: false })
    wardLayer.addTo(group)

    const fitPts: [number, number][] = []
    for (const r of roads) {
      const val = failBy.get(r.road_id)?.failed_inr ?? 0
      const i = tier(val)
      const pts = r.coords.map(([lo, la]) => [la, lo] as [number, number])
      fitPts.push(...pts)
      L.polyline(pts, { color: v(RAMP[i]), opacity: RAMP_OPACITY[i], weight: WIDTHS[i], lineCap: 'round' })
        .bindTooltip(`${esc(r.road_name)}: ${formatInr(val)} failed`, { sticky: true })
        .addTo(group)
    }
    if (on.Hotspots)
      for (const h of hotspots)
        L.marker([h.lat, h.lon], { icon: triangle(h.tide_sensitive) })
          .bindTooltip(`Flood hotspot: ${esc(h.name)}${h.tide_sensitive ? ' (tide-sensitive)' : ''}, flagged ${h.years_flagged} yrs`)
          .addTo(group)
    for (const f of fac.filter((x) => on[x.type === 'Hospital' ? 'Hospitals' : 'Schools']))
      L.marker([f.lat, f.lon], { icon: square(f.type === 'Hospital') }).bindTooltip(`${f.type}: ${esc(f.name)}`).addTo(group)
    if (on['Road accidents'])
      for (const a of accidents)
        L.marker([a.lat, a.lon], { icon: cross() })
          .bindTooltip(`${esc(a.severity)} accident, ${esc(a.vehicle_type)}: ${esc(a.cause)} (${esc(a.occurred_at)})`)
          .addTo(group)
    if (on['Open complaints'])
      for (const c of complaints) {
        const p = land.data?.moved[c.id] ?? ([c.lat!, c.lon!] as [number, number])
        L.circleMarker(p, { radius: 5.5, color: v('--f-stamp'), weight: 1, fillColor: v('--f-stamp'), fillOpacity: 0.7 })
          .bindTooltip(`${esc(c.id)}: ${esc(c.category)}, ${c.upvotes} upvotes`)
          .addTo(group)
      }
    const b = fitPts.length ? L.latLngBounds(fitPts) : wardLayer.getBounds()
    map.fitBounds(b.isValid() ? b.pad(0.15) : wardLayer.getBounds(), { maxZoom: 15 })
    // the derived arrays are rebuilt each render; these keys are what actually changes the map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, ready, land.data, on, workOrders])

  const error = geo.error ?? comp.error ?? acc.error
  if (error) return <p className="cv-muted">{error}</p>
  if (!ready) return <p className="cv-muted">Loading…</p>
  if (!gw) return <p className="cv-muted">No map geometry for Ward {code}.</p>

  return (
    <section className="cv-section cv-map">
      <h3>Ward {code} map: where repairs failed</h3>
      <div className="cv-map-layers">
        {LAYERS.map((l) => (
          <label key={l}>
            <input type="checkbox" checked={on[l]} onChange={() => setOn({ ...on, [l]: !on[l] })} /> {l} <b>{counts[l]}</b>
          </label>
        ))}
      </div>
      <div ref={box} className="cv-map-canvas cv-map-leaflet" role="region" aria-label={`Map of Ward ${code}`} />
      <div className="cv-map-legend">
        <div className="lg-roads">
          <span className="lg-title">Road colour/width = ₹ failed repairs</span>
          {['none', 'low', 'medium', 'high'].map((label, i) => (
            <span key={label}>
              <svg viewBox="0 0 36 14" aria-hidden="true">
                <line x1="4" y1="7" x2="32" y2="7" style={{ stroke: `var(${RAMP[i]})` }} strokeOpacity={RAMP_OPACITY[i]} strokeWidth={WIDTHS[i]} strokeLinecap="round" />
              </svg>
              {label}
            </span>
          ))}
        </div>
        <span>{mk(<polygon points="7,2 12,11 2,11" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />)} hotspot</span>
        <span>{mk(<polygon points="7,2 12,11 2,11" fill={SHEET} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />)} tide-sensitive hotspot</span>
        <span>{mk(<rect x="2" y="2" width="10" height="10" rx="1.5" fill={INK} stroke={INK} strokeWidth="1.5" />)} hospital</span>
        <span>{mk(<rect x="2" y="2" width="10" height="10" rx="1.5" fill={SHEET} stroke={INK} strokeWidth="1.5" />)} school</span>
        <span>{mk(<g stroke={RED} strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="3" x2="11" y2="11" /><line x1="3" y1="11" x2="11" y2="3" /></g>)} road-caused accident</span>
        <span>{mk(<circle cx="7" cy="7" r="3.5" fill={VIOLET} fillOpacity="0.7" stroke={VIOLET} />)} open complaint</span>
      </div>
      <SourceChip
        files={['wards.geojson', 'roads.geojson', 'work_orders.csv', 'flood_hotspots.csv', 'facilities.csv', 'accidents.csv', 'complaints.csv']}
        rule="Road colour and width use the sum of b_fail (failed-repair rupees) per road_id in this ward, in terciles. Accidents shown are road-caused only. Complaints shown are open with a location. Map tiles © Esri; ward outline clipped to land (© OpenStreetMap contributors)."
      />
      <EvidenceDrawer
        label="Roads with failed repairs"
        rows={failRows}
        columns={[
          { key: 'road_id', label: 'Road' },
          { key: 'road_name', label: 'Name' },
          { key: 'failed_inr', label: '₹ failed', inr: true },
        ]}
        filename={`failed_roads_${code}.csv`}
        sumKey="failed_inr"
      />
    </section>
  )
}
