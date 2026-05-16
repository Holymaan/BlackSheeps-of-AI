import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  listSchools,
  getSchoolRoute,
  type SchoolSummary,
  type SchoolRouteResponse,
  type BusStopPoint,
  type BusRouteInfo,
} from '../api/client'
import { useTranslation } from 'react-i18next'

// Split, Croatia
const DEFAULT_CENTER: [number, number] = [16.44, 43.508]
const DEFAULT_ZOOM = 12

// ── Bus colour palette ───────────────────────────────────────────────────────

const BUS_COLORS = [
  { line: '#F59E0B', glow: '#FDE68A', dot: '#F59E0B', markerText: '#1a1a1a' },
  { line: '#3B82F6', glow: '#BFDBFE', dot: '#3B82F6', markerText: '#fff' },
  { line: '#10B981', glow: '#A7F3D0', dot: '#10B981', markerText: '#fff' },
  { line: '#8B5CF6', glow: '#DDD6FE', dot: '#8B5CF6', markerText: '#fff' },
  { line: '#EF4444', glow: '#FECACA', dot: '#EF4444', markerText: '#fff' },
  { line: '#EC4899', glow: '#FBCFE8', dot: '#EC4899', markerText: '#fff' },
  { line: '#F97316', glow: '#FED7AA', dot: '#F97316', markerText: '#fff' },
  { line: '#06B6D4', glow: '#A5F3FC', dot: '#06B6D4', markerText: '#fff' },
]

function bc(busNum: number) {
  return BUS_COLORS[(busNum - 1) % BUS_COLORS.length]
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`
}

/** Add minutes to an HH:MM string and return HH:MM. */
function clockTime(departure: string, addMinutes: number): string {
  const [h, m] = departure.split(':').map(Number)
  const total = h * 60 + m + Math.round(addMinutes)
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function flattenLegs(legs: number[][][]): number[][] {
  return legs.flatMap(l => l)
}

/** Returns per-bus index (1-based) for every stop, plus grouped data. */
function computeBusIndices(stops: BusStopPoint[]): number[] {
  const indices: number[] = []
  const counters = new Map<number, number>()
  for (const s of stops) {
    const n = (counters.get(s.busNumber) ?? 0) + 1
    counters.set(s.busNumber, n)
    indices.push(n)
  }
  return indices
}

function groupByBus(stops: BusStopPoint[], busIndices: number[]): { busNum: number; stops: { stop: BusStopPoint; globalIdx: number; busIdx: number }[] }[] {
  const groups: { busNum: number; stops: { stop: BusStopPoint; globalIdx: number; busIdx: number }[] }[] = []
  let cur: typeof groups[0] | null = null
  stops.forEach((s, i) => {
    if (!cur || cur.busNum !== s.busNumber) {
      cur = { busNum: s.busNumber, stops: [] }
      groups.push(cur)
    }
    cur.stops.push({ stop: s, globalIdx: i, busIdx: busIndices[i] })
  })
  return groups
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchoolRoutingPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapReadyRef = useRef(false)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const busMarkersRef = useRef<Map<number, maplibregl.Marker[]>>(new Map())
  const busLayerIdsRef = useRef<Map<number, string[]>>(new Map())
  const animFrameRefs = useRef<number[]>([])
  const layerIdsRef = useRef<string[]>([])
  const sourceIdsRef = useRef<string[]>([])
  const { t } = useTranslation()

  const [schools, setSchools] = useState<SchoolSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [busCapacity, setBusCapacity] = useState(50)
  const [loading, setLoading] = useState(false)
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [result, setResult] = useState<SchoolRouteResponse | null>(null)
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set())
  const [departureTime, setDepartureTime] = useState('07:00')
  const [visibleBuses, setVisibleBuses] = useState<Set<number>>(new Set())
  const [showHeatmap, setShowHeatmap] = useState(true)

  const toggleStop = (idx: number) =>
    setExpandedStops(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })

  const toggleBusVisibility = (busNum: number) =>
    setVisibleBuses(prev => {
      const next = new Set(prev)
      next.has(busNum) ? next.delete(busNum) : next.add(busNum)
      return next
    })

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.on('load', () => { mapReadyRef.current = true })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Load school list ────────────────────────────────────────────────────────
  useEffect(() => {
    listSchools()
      .then(setSchools)
      .catch(() => setSchoolsError(t('routing.loadError')))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear map helpers ───────────────────────────────────────────────────────
  const clearMap = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    animFrameRefs.current.forEach(id => cancelAnimationFrame(id))
    animFrameRefs.current = []
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    for (const id of layerIdsRef.current) {
      if (map.getLayer(id)) map.removeLayer(id)
    }
    for (const id of sourceIdsRef.current) {
      if (map.getSource(id)) map.removeSource(id)
    }
    layerIdsRef.current = []
    sourceIdsRef.current = []
    busMarkersRef.current.clear()
    busLayerIdsRef.current.clear()
  }, [])

  // ── Animate one bus route (runs independently) ─────────────────────────────
  const animateBusRoute = useCallback((
    map: maplibregl.Map,
    coords: number[][],
    color: { line: string; glow: string; dot: string },
    busIdx: number,
  ) => {
    const srcId = `route-bus-${busIdx}`
    const glowId = `glow-bus-${busIdx}`
    const lineId = `line-bus-${busIdx}`
    const dotSrc = `dot-bus-${busIdx}`
    const dotId = `dot-layer-${busIdx}`

    sourceIdsRef.current.push(srcId, dotSrc)
    layerIdsRef.current.push(glowId, lineId, dotId)

    map.addSource(srcId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice(0, 1) }, properties: {} }] },
    })
    map.addSource(dotSrc, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: coords[0] }, properties: {} }] },
    })
    map.addLayer({
      id: glowId, type: 'line', source: srcId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color.glow, 'line-width': 12, 'line-opacity': 0.35 },
    })
    map.addLayer({
      id: lineId, type: 'line', source: srcId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color.line, 'line-width': 4.5, 'line-opacity': 0.9 },
    })
    map.addLayer({
      id: dotId, type: 'circle', source: dotSrc,
      paint: { 'circle-radius': 7, 'circle-color': color.dot, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' },
    })

    const total = coords.length
    const duration = 3000
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const idx = Math.min(Math.floor(eased * total), total - 1)

      const src = map.getSource(srcId) as maplibregl.GeoJSONSource | undefined
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice(0, idx + 1) }, properties: {} }],
        })
      }
      const dSrc = map.getSource(dotSrc) as maplibregl.GeoJSONSource | undefined
      if (dSrc) {
        dSrc.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: coords[idx] }, properties: {} }],
        })
      }

      if (progress < 1) {
        const frame = requestAnimationFrame(step)
        animFrameRefs.current.push(frame)
      } else {
        if (map.getLayer(dotId)) map.removeLayer(dotId)
        if (map.getSource(dotSrc)) map.removeSource(dotSrc)
        sourceIdsRef.current = sourceIdsRef.current.filter(id => id !== dotSrc)
        layerIdsRef.current = layerIdsRef.current.filter(id => id !== dotId)
      }
    }

    const frame = requestAnimationFrame(step)
    animFrameRefs.current.push(frame)
  }, [])

  // ── Render result on map ────────────────────────────────────────────────────
  const renderOnMap = useCallback((data: SchoolRouteResponse) => {
    const map = mapRef.current
    if (!map) return

    const bounds = new maplibregl.LngLatBounds()

    // Bus stop markers — numbered per bus (1, 2, 3… restarting for each bus)
    const perBusIdx = computeBusIndices(data.busStops)
    data.busStops.forEach((stop, i) => {
      const color = bc(stop.busNumber)
      const num = perBusIdx[i]
      const el = document.createElement('div')
      Object.assign(el.style, {
        boxSizing: 'border-box' as const,
        width: '26px', height: '26px', borderRadius: '50%',
        background: color.line, border: '3px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        textAlign: 'center' as const, lineHeight: '20px',
        fontSize: '11px', fontWeight: 'bold',
        color: color.markerText, cursor: 'pointer',
      })
      el.textContent = String(num)

      const stopLabel = stop.name || `${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}`
      const studentList = stop.studentNames.map(n => `<li>${n}</li>`).join('')
      const arrivalClock = clockTime(departureTime, stop.estimatedArrivalMin)
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lon, stop.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, maxWidth: '260px' }).setHTML(
            `<p style="margin:0;font-weight:600">${t('routing.bus')} ${stop.busNumber} — ${t('routing.stop', { number: num })}</p>
             <p style="margin:2px 0 0;font-size:13px;color:#333">${stopLabel}</p>
             <p style="margin:4px 0 0;font-size:12px;color:#555">
               🕐 ${arrivalClock} &middot;
               ${stop.studentCount} ${t('routing.students').toLowerCase()} &middot;
               +${stop.estimatedArrivalMin} min
             </p>
             <ul style="margin:4px 0 0;padding-left:16px;font-size:11px;color:#666">${studentList}</ul>`
          )
        )
        .addTo(map)
      markersRef.current.push(marker)
      // Track per-bus markers
      if (!busMarkersRef.current.has(stop.busNumber)) busMarkersRef.current.set(stop.busNumber, [])
      busMarkersRef.current.get(stop.busNumber)!.push(marker)
      bounds.extend([stop.lon, stop.lat])
    })

    // School marker
    const schoolEl = document.createElement('div')
    Object.assign(schoolEl.style, {
      width: '34px', height: '34px', borderRadius: '50%',
      background: '#1e3a5f', border: '3px solid #fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    })
    schoolEl.innerHTML = `<svg width="16" height="16" fill="white" viewBox="0 0 24 24">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`
    const schoolMarker = new maplibregl.Marker({ element: schoolEl })
      .setLngLat([data.school.lon, data.school.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 18 }).setHTML(
          `<p style="margin:0;font-weight:600">${data.school.name}</p>
           <p style="margin:2px 0 0;font-size:12px;color:#555">${t('routing.destination')}</p>`
        )
      )
      .addTo(map)
    markersRef.current.push(schoolMarker)
    bounds.extend([data.school.lon, data.school.lat])

    // Heatmap layer for student home addresses
    if (data.studentHomes?.length) {
      const heatSrc = 'student-homes-heat'
      const heatLayer = 'student-homes-heatmap'
      const pointLayer = 'student-homes-points'
      sourceIdsRef.current.push(heatSrc)
      layerIdsRef.current.push(heatLayer, pointLayer)

      map.addSource(heatSrc, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: data.studentHomes.map(h => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [h.lon, h.lat] },
            properties: { name: h.name },
          })),
        },
      })

      map.addLayer({
        id: heatLayer,
        type: 'heatmap',
        source: heatSrc,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 15, 2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 15, 15, 30],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(103,169,207,0.4)',
            0.4, 'rgba(209,229,143,0.5)',
            0.6, 'rgba(253,219,119,0.6)',
            0.8, 'rgba(239,138,98,0.7)',
            1, 'rgba(178,24,43,0.8)',
          ],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 15, 0.4],
        },
      })

      // Small dots visible at higher zoom
      map.addLayer({
        id: pointLayer,
        type: 'circle',
        source: heatSrc,
        minzoom: 13,
        paint: {
          'circle-radius': 5,
          'circle-color': '#e25822',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.8,
        },
      })

      data.studentHomes.forEach(h => bounds.extend([h.lon, h.lat]))
    }

    // Extend bounds with all route coords
    data.busRoutes.forEach(br => {
      flattenLegs(br.legs).forEach(([lon, lat]) => bounds.extend([lon, lat]))
    })

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 800 })
    }
    map.resize()

    // Animate ALL bus routes in parallel & track layer IDs per bus
    setTimeout(() => {
      data.busRoutes.forEach((br, i) => {
        const coords = flattenLegs(br.legs)
        if (coords.length < 2) return
        // Pre-register layer IDs for this bus so we can toggle visibility
        const ids = [`glow-bus-${i}`, `line-bus-${i}`]
        busLayerIdsRef.current.set(br.busNumber, ids)
        animateBusRoute(map, coords, bc(br.busNumber), i)
      })
    }, 900)
  }, [t, animateBusRoute, departureTime])

  // ── Re-render when result arrives or departure time changes ─────────────────
  useEffect(() => {
    if (!result) return
    clearMap()
    if (mapReadyRef.current) {
      renderOnMap(result)
    } else {
      mapRef.current?.once('load', () => renderOnMap(result))
    }
  }, [result, renderOnMap, clearMap])

  // ── Sync bus visibility with map ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !result) return

    for (const br of result.busRoutes) {
      const visible = visibleBuses.has(br.busNumber)
      const vis = visible ? 'visible' : 'none'

      // Toggle route layers
      const layerIds = busLayerIdsRef.current.get(br.busNumber) ?? []
      for (const id of layerIds) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
      }

      // Toggle stop markers
      const markers = busMarkersRef.current.get(br.busNumber) ?? []
      for (const m of markers) {
        m.getElement().style.display = visible ? '' : 'none'
        if (!visible) m.getPopup()?.remove()          // close open popup
      }
    }
  }, [visibleBuses, result])

  // ── Sync heatmap visibility ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !result) return
    const vis = showHeatmap ? 'visible' : 'none'
    if (map.getLayer('student-homes-heatmap')) map.setLayoutProperty('student-homes-heatmap', 'visibility', vis)
    if (map.getLayer('student-homes-points')) map.setLayoutProperty('student-homes-points', 'visibility', vis)
  }, [showHeatmap, result])

  // ── Calculate route ─────────────────────────────────────────────────────────
  const calculate = async () => {
    if (!selectedId) return
    setLoading(true)
    setRouteError(null)
    clearMap()
    setResult(null)
    setExpandedStops(new Set())
    try {
      const data = await getSchoolRoute(Number(selectedId), busCapacity)
      setVisibleBuses(new Set(data.busRoutes.map(r => r.busNumber)))
      setResult(data)
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : t('routing.routeError'))
    } finally {
      setLoading(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const perBusIndices = result ? computeBusIndices(result.busStops) : []
  const busGroups = result ? groupByBus(result.busStops, perBusIndices) : []
  const totalTime = result ? Math.max(...result.busRoutes.map(r => r.timeSec)) : 0
  const totalDist = result ? result.busRoutes.reduce((s, r) => s + r.lengthKm, 0) : 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-2xl font-display font-bold text-gray-900">{t('routing.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('routing.subtitle')}</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col p-5 gap-5 overflow-y-auto shrink-0">

          {/* School selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('routing.schoolLabel')}</label>
            {schoolsError
              ? <p className="text-xs text-red-500">{schoolsError}</p>
              : (
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">{t('routing.selectSchool')}</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
          </div>

          {/* Bus capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('routing.busCapacityLabel')}</label>
            <input
              type="number" min={1} max={200}
              value={busCapacity}
              onChange={e => setBusCapacity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Departure time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('routing.departureTimeLabel')}</label>
            <input
              type="time"
              value={departureTime}
              onChange={e => setDepartureTime(e.target.value || '07:00')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Calculate button */}
          <button
            onClick={calculate}
            disabled={!selectedId || loading}
            className="w-full px-4 py-2.5 bg-bus-yellow text-gray-900 font-semibold rounded-lg hover:bg-bus-yellow-dark transition text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('routing.calculating') : t('routing.calculate')}
          </button>

          {routeError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{routeError}</div>
          )}

          {/* ── Results ── */}
          {result && (
            <div className="space-y-5 animate-fade-in">

              {/* Summary */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('routing.summary')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label={t('routing.busStops')} value={String(result.busStops.length)} />
                  <StatCard label={t('routing.travelTime')} value={formatTime(totalTime)} />
                  <StatCard label={t('routing.distance')} value={`${totalDist.toFixed(1)} km`} />
                  <StatCard label={t('routing.totalStudents')} value={String(result.fleet.totalStudents)} />
                </div>
              </div>

              {/* Fleet info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">{t('routing.busesNeeded')}</p>
                    <p className="text-2xl font-bold text-blue-900 mt-0.5">{result.fleet.busesNeeded}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-500">{t('routing.capacity')}: {result.fleet.busCapacity}</p>
                    <p className="text-xs text-blue-500">{result.fleet.totalStudents} {t('routing.students').toLowerCase()}</p>
                  </div>
                </div>
              </div>

              {/* Heatmap toggle */}
              <button
                onClick={() => setShowHeatmap(v => !v)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${showHeatmap ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-gray-300 text-white'}`}>
                  {showHeatmap ? '✓' : ''}
                </span>
                {t('routing.heatmapToggle')}
                <span className="ml-auto text-xs opacity-60">{result.studentHomes?.length ?? 0}</span>
              </button>

              {/* Per-bus route cards */}
              <div className="space-y-1.5">
                {result.busRoutes.map(br => {
                  const color = bc(br.busNumber)
                  const group = busGroups.find(g => g.busNum === br.busNumber)
                  const passengers = group ? group.stops.reduce((s, st) => s + st.stop.studentCount, 0) : 0
                  const isVisible = visibleBuses.has(br.busNumber)
                  return (
                    <div key={br.busNumber} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-opacity ${isVisible ? 'bg-gray-50 border-gray-100' : 'bg-gray-100 border-gray-200 opacity-50'}`}>
                      <button
                        onClick={() => toggleBusVisibility(br.busNumber)}
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition hover:scale-110"
                        style={{ backgroundColor: isVisible ? color.line : '#9ca3af', color: isVisible ? color.markerText : '#fff' }}
                        title={isVisible ? t('routing.hideBus') : t('routing.showBus')}
                      >{br.busNumber}</button>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800">{t('routing.bus')} {br.busNumber}</span>
                        <span className="text-gray-400 ml-1.5">{passengers} {t('routing.students').toLowerCase()}</span>
                      </div>
                      <span className="text-gray-500 tabular-nums">{formatTime(br.timeSec)}</span>
                      <span className="text-gray-400">{br.lengthKm.toFixed(1)} km</span>
                      <span className="text-gray-600 font-medium tabular-nums">🏫 {clockTime(departureTime, br.timeSec / 60)}</span>
                      {/* Eye toggle */}
                      <button
                        onClick={() => toggleBusVisibility(br.busNumber)}
                        className="p-1 rounded hover:bg-gray-200 transition"
                        title={isVisible ? t('routing.hideBus') : t('routing.showBus')}
                      >
                        {isVisible ? (
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Destination */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('routing.destination')}</h3>
                <div className="flex items-center gap-2.5 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#1e3a5f] shrink-0" />
                  <span className="text-sm text-gray-800 font-medium leading-tight">{result.school.name}</span>
                </div>
              </div>

              {/* Stops grouped by bus */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t('routing.pickupStops', { count: result.busStops.length })}
                </h3>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-0.5">
                  {busGroups.map(group => {
                    const color = bc(group.busNum)
                    const groupStudents = group.stops.reduce((s, st) => s + st.stop.studentCount, 0)
                    const busRoute = result.busRoutes.find(r => r.busNumber === group.busNum)
                    const isBusVisible = visibleBuses.has(group.busNum)
                    return (
                      <div key={group.busNum} className={`transition-opacity ${isBusVisible ? '' : 'opacity-40'}`}>
                        {/* Bus header */}
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg border"
                          style={{ backgroundColor: color.glow + '30', borderColor: color.glow }}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: color.line, color: color.markerText }}
                          >{group.busNum}</span>
                          <span className="text-xs font-semibold text-gray-700 flex-1">
                            {t('routing.bus')} {group.busNum}
                            {busRoute && <span className="font-normal text-gray-400 ml-1">{formatTime(busRoute.timeSec)} &middot; {busRoute.lengthKm.toFixed(1)} km &middot; {t('routing.schoolArrival')} {clockTime(departureTime, busRoute.timeSec / 60)}</span>}
                          </span>
                          <span className="text-[10px] text-gray-500">{groupStudents}/{result.fleet.busCapacity}</span>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (groupStudents / result.fleet.busCapacity) * 100)}%`, backgroundColor: color.line }} />
                          </div>
                        </div>

                        {/* Stops */}
                        <div className="border-x border-b rounded-b-lg overflow-hidden" style={{ borderColor: color.glow }}>
                          {group.stops.map(({ stop, globalIdx, busIdx }) => (
                            <div key={globalIdx} className="text-xs">
                              <button
                                onClick={() => toggleStop(globalIdx)}
                                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 transition"
                              >
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5"
                                  style={{ backgroundColor: color.line, color: color.markerText }}
                                >{busIdx}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-800 font-medium truncate">
                                    {stop.name || `${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-gray-500">
                                    <span className="font-semibold text-gray-700">{clockTime(departureTime, stop.estimatedArrivalMin)}</span>
                                    <span className="text-gray-400">(+{stop.estimatedArrivalMin} min)</span>
                                    <span>&middot;</span>
                                    <span>{stop.studentCount} {t('routing.students').toLowerCase()}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                  <span className="font-bold rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: color.line + '33', color: color.line }}>
                                    {stop.studentCount}
                                  </span>
                                  <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedStops.has(globalIdx) ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>
                              {expandedStops.has(globalIdx) && (
                                <div className="px-3 pb-2 pt-0 border-t border-gray-100 bg-white">
                                  <ul className="mt-1.5 space-y-0.5">
                                    {stop.studentNames.map((name, j) => (
                                      <li key={j} className="flex items-center gap-1.5 text-gray-600">
                                        <svg className="w-3 h-3 shrink-0" style={{ color: color.line }} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                        </svg>
                                        {name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </aside>

        {/* ── Map ── */}
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl shadow-xl px-8 py-6 text-center">
                <div className="w-9 h-9 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">{t('routing.calculatingOverlay')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('routing.calculatingSubtext')}</p>
              </div>
            </div>
          )}
          {!result && !loading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-xl shadow px-4 py-2.5 text-xs text-gray-500 pointer-events-none">
              {t('routing.hint')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
