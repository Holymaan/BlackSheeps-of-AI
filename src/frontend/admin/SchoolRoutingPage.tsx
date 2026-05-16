import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  listSchools,
  getSchoolRoute,
  type SchoolSummary,
  type SchoolRouteResponse,
  type BusStopPoint,
} from '../api/client'
import { useTranslation } from 'react-i18next'

// Split, Croatia
const DEFAULT_CENTER: [number, number] = [16.44, 43.508]
const DEFAULT_ZOOM = 12

// ── Bus colour palette ───────────────────────────────────────────────────────

const BUS_COLORS = [
  { line: '#F59E0B', glow: '#FDE68A', bg: 'bg-amber-400',  text: 'text-amber-900',  border: 'border-amber-200', bgLight: 'bg-amber-50',  borderLight: 'border-amber-100', dot: '#F59E0B' },
  { line: '#3B82F6', glow: '#BFDBFE', bg: 'bg-blue-500',   text: 'text-white',      border: 'border-blue-200',  bgLight: 'bg-blue-50',   borderLight: 'border-blue-100',  dot: '#3B82F6' },
  { line: '#10B981', glow: '#A7F3D0', bg: 'bg-emerald-500', text: 'text-white',      border: 'border-emerald-200', bgLight: 'bg-emerald-50', borderLight: 'border-emerald-100', dot: '#10B981' },
  { line: '#8B5CF6', glow: '#DDD6FE', bg: 'bg-violet-500', text: 'text-white',      border: 'border-violet-200', bgLight: 'bg-violet-50', borderLight: 'border-violet-100', dot: '#8B5CF6' },
  { line: '#EF4444', glow: '#FECACA', bg: 'bg-red-500',    text: 'text-white',      border: 'border-red-200',   bgLight: 'bg-red-50',    borderLight: 'border-red-100',   dot: '#EF4444' },
  { line: '#EC4899', glow: '#FBCFE8', bg: 'bg-pink-500',   text: 'text-white',      border: 'border-pink-200',  bgLight: 'bg-pink-50',   borderLight: 'border-pink-100',  dot: '#EC4899' },
  { line: '#F97316', glow: '#FED7AA', bg: 'bg-orange-500', text: 'text-white',      border: 'border-orange-200', bgLight: 'bg-orange-50', borderLight: 'border-orange-100', dot: '#F97316' },
  { line: '#06B6D4', glow: '#A5F3FC', bg: 'bg-cyan-500',   text: 'text-white',      border: 'border-cyan-200',  bgLight: 'bg-cyan-50',   borderLight: 'border-cyan-100',  dot: '#06B6D4' },
]

function busColor(busNum: number) {
  return BUS_COLORS[(busNum - 1) % BUS_COLORS.length]
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`
}

/** Flatten all legs into a single coordinate array. */
function flattenLegs(legs: number[][][]): number[][] {
  return legs.flatMap(leg => leg)
}

/** Split the flat route coordinates into per-bus segments using stop bus assignments. */
function splitByBus(
  allCoords: number[][],
  legs: number[][][],
  stops: BusStopPoint[],
): { busNum: number; coords: number[][] }[] {
  if (stops.length === 0) return []

  // Each leg[i] connects stop[i] to stop[i+1] (last leg goes to school).
  // The bus owning leg[i] is stops[i].busNumber.
  // We merge consecutive legs belonging to the same bus into one segment.
  const segments: { busNum: number; coords: number[][] }[] = []
  let currentBus = stops[0].busNumber
  let currentCoords: number[][] = []

  for (let i = 0; i < legs.length; i++) {
    const thisBus = i < stops.length ? stops[i].busNumber : stops[stops.length - 1].busNumber

    if (thisBus !== currentBus && currentCoords.length > 0) {
      segments.push({ busNum: currentBus, coords: currentCoords })
      // Start new segment — include last coord of previous as first of next for continuity
      currentCoords = [currentCoords[currentCoords.length - 1]]
      currentBus = thisBus
    }

    currentCoords.push(...legs[i])
  }

  if (currentCoords.length > 0) {
    segments.push({ busNum: currentBus, coords: currentCoords })
  }

  return segments
}

/** Group stops by bus number, preserving order. */
function groupByBus(stops: BusStopPoint[]): { busNum: number; stops: { stop: BusStopPoint; globalIdx: number }[] }[] {
  const groups: { busNum: number; stops: { stop: BusStopPoint; globalIdx: number }[] }[] = []
  let current: typeof groups[0] | null = null
  stops.forEach((s, i) => {
    if (!current || current.busNum !== s.busNumber) {
      current = { busNum: s.busNumber, stops: [] }
      groups.push(current)
    }
    current.stops.push({ stop: s, globalIdx: i })
  })
  return groups
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchoolRoutingPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapReadyRef = useRef(false)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const animFrameRef = useRef<number>(0)
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

  const toggleStop = (idx: number) =>
    setExpandedStops(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
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
    cancelAnimationFrame(animFrameRef.current)
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
  }, [])

  // ── Animate one bus segment ────────────────────────────────────────────────
  const animateSegment = useCallback((
    map: maplibregl.Map,
    coords: number[][],
    color: { line: string; glow: string; dot: string },
    segIdx: number,
    durationMs: number,
  ): Promise<void> => {
    return new Promise(resolve => {
      const srcId = `route-seg-${segIdx}`
      const glowId = `glow-seg-${segIdx}`
      const lineId = `line-seg-${segIdx}`
      const dotSrc = `dot-seg-${segIdx}`
      const dotId = `dot-layer-${segIdx}`

      sourceIdsRef.current.push(srcId, dotSrc)
      layerIdsRef.current.push(glowId, lineId, dotId)

      const emptyLine: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice(0, 1) }, properties: {} }],
      }
      const emptyPoint: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: coords[0] }, properties: {} }],
      }

      map.addSource(srcId, { type: 'geojson', data: emptyLine })
      map.addSource(dotSrc, { type: 'geojson', data: emptyPoint })

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
      const start = performance.now()

      const step = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1)
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
          animFrameRef.current = requestAnimationFrame(step)
        } else {
          // Remove the dot after animation completes
          if (map.getLayer(dotId)) map.removeLayer(dotId)
          if (map.getSource(dotSrc)) map.removeSource(dotSrc)
          sourceIdsRef.current = sourceIdsRef.current.filter(id => id !== dotSrc)
          layerIdsRef.current = layerIdsRef.current.filter(id => id !== dotId)
          resolve()
        }
      }

      animFrameRef.current = requestAnimationFrame(step)
    })
  }, [])

  // ── Render result on map ────────────────────────────────────────────────────
  const renderOnMap = useCallback((data: SchoolRouteResponse) => {
    const map = mapRef.current
    if (!map) return

    const bounds = new maplibregl.LngLatBounds()

    // Bus stop markers — colored circles numbered 1…N
    data.busStops.forEach((stop, i) => {
      const bc = busColor(stop.busNumber)
      const el = document.createElement('div')
      Object.assign(el.style, {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        background: bc.line,
        border: '3px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        color: stop.busNumber === 1 ? '#1a1a1a' : '#fff',
        cursor: 'pointer',
      })
      el.textContent = String(i + 1)

      const stopLabel = stop.name || `${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}`
      const studentList = stop.studentNames.map(n => `<li>${n}</li>`).join('')
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lon, stop.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, maxWidth: '260px' }).setHTML(
            `<p style="margin:0;font-weight:600">${t('routing.stop', { number: i + 1 })}</p>
             <p style="margin:2px 0 0;font-size:13px;color:#333">${stopLabel}</p>
             <p style="margin:4px 0 0;font-size:12px;color:#555">
               ${t('routing.bus')} ${stop.busNumber} &middot;
               ${stop.studentCount} ${t('routing.students').toLowerCase()} &middot;
               ${stop.estimatedArrivalMin} min
             </p>
             <ul style="margin:4px 0 0;padding-left:16px;font-size:11px;color:#666">${studentList}</ul>`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([stop.lon, stop.lat])
    })

    // School marker
    const schoolEl = document.createElement('div')
    Object.assign(schoolEl.style, {
      width: '34px', height: '34px', borderRadius: '50%',
      background: '#EF4444', border: '3px solid #fff',
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

    // Extend bounds with all route coords
    const allCoords = flattenLegs(data.route.legs)
    allCoords.forEach(([lon, lat]) => bounds.extend([lon, lat]))

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 800 })
    }
    map.resize()

    // Split route into per-bus coloured segments and animate sequentially
    const segments = splitByBus(allCoords, data.route.legs, data.busStops)
    const durationPerSeg = Math.max(1200, 3000 / Math.max(segments.length, 1))

    setTimeout(async () => {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (seg.coords.length < 2) continue
        const bc = busColor(seg.busNum)
        await animateSegment(map, seg.coords, bc, i, durationPerSeg)
      }
    }, 900)
  }, [t, animateSegment])

  // ── Re-render when result arrives and map is ready ──────────────────────────
  useEffect(() => {
    if (!result) return
    if (mapReadyRef.current) {
      renderOnMap(result)
    } else {
      mapRef.current?.once('load', () => renderOnMap(result))
    }
  }, [result, renderOnMap])

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
      setResult(data)
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : t('routing.routeError'))
    } finally {
      setLoading(false)
    }
  }

  // ── Grouped stops for sidebar ──────────────────────────────────────────────
  const busGroups = result ? groupByBus(result.busStops) : []

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Page header */}
      <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-2xl font-display font-bold text-gray-900">{t('routing.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('routing.subtitle')}</p>
      </div>

      {/* Body: sidebar + map */}
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
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )
            }
          </div>

          {/* Bus capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('routing.busCapacityLabel')}</label>
            <input
              type="number"
              min={1}
              max={200}
              value={busCapacity}
              onChange={e => setBusCapacity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Action button */}
          <button
            onClick={calculate}
            disabled={!selectedId || loading}
            className="w-full px-4 py-2.5 bg-bus-yellow text-gray-900 font-semibold rounded-lg hover:bg-bus-yellow-dark transition text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('routing.calculating') : t('routing.calculate')}
          </button>

          {/* Route error */}
          {routeError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {routeError}
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <div className="space-y-5 animate-fade-in">

              {/* Summary cards */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('routing.summary')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label={t('routing.busStops')} value={String(result.busStops.length)} />
                  <StatCard label={t('routing.travelTime')} value={formatTime(result.route.timeSec)} />
                  <StatCard label={t('routing.distance')} value={`${result.route.lengthKm.toFixed(1)} km`} />
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

              {/* Destination */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('routing.destination')}</h3>
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <span className="w-4 h-4 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm text-gray-800 font-medium leading-tight">{result.school.name}</span>
                </div>
              </div>

              {/* Bus stop list — grouped by bus */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t('routing.pickupStops', { count: result.busStops.length })}
                </h3>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-0.5">
                  {busGroups.map(group => {
                    const bc = busColor(group.busNum)
                    const groupStudents = group.stops.reduce((sum, s) => sum + s.stop.studentCount, 0)
                    return (
                      <div key={group.busNum}>
                        {/* Bus header */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg ${bc.bgLight} ${bc.borderLight} border`}>
                          <span className={`w-5 h-5 rounded-full ${bc.bg} ${bc.text} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                            {group.busNum}
                          </span>
                          <span className="text-xs font-semibold text-gray-700 flex-1">
                            {t('routing.bus')} {group.busNum}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {groupStudents}/{result.fleet.busCapacity}
                          </span>
                          {/* Mini capacity bar */}
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (groupStudents / result.fleet.busCapacity) * 100)}%`,
                                backgroundColor: bc.line,
                              }}
                            />
                          </div>
                        </div>

                        {/* Stops in this bus */}
                        <div className={`space-y-0 border-x border-b rounded-b-lg ${bc.borderLight} overflow-hidden`}>
                          {group.stops.map(({ stop, globalIdx }) => (
                            <div key={globalIdx} className="text-xs">
                              {/* Stop header — clickable */}
                              <button
                                onClick={() => toggleStop(globalIdx)}
                                className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 transition ${bc.bgLight}`}
                              >
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5"
                                  style={{ backgroundColor: bc.line, color: group.busNum === 1 ? '#1a1a1a' : '#fff' }}
                                >
                                  {globalIdx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-800 font-medium truncate">
                                    {stop.name || `${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-gray-500">
                                    <span>{stop.estimatedArrivalMin} min</span>
                                    <span>&middot;</span>
                                    <span>{stop.studentCount} {t('routing.students').toLowerCase()}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                  <span
                                    className="font-bold rounded-full px-1.5 py-0.5 text-[10px]"
                                    style={{ backgroundColor: bc.line + '33', color: bc.line }}
                                  >
                                    {stop.studentCount}
                                  </span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedStops.has(globalIdx) ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>

                              {/* Expanded student list */}
                              {expandedStops.has(globalIdx) && (
                                <div className="px-3 pb-2 pt-0 border-t border-gray-100 bg-white">
                                  <ul className="mt-1.5 space-y-0.5">
                                    {stop.studentNames.map((name, j) => (
                                      <li key={j} className="flex items-center gap-1.5 text-gray-600">
                                        <svg className="w-3 h-3 shrink-0" style={{ color: bc.line }} fill="currentColor" viewBox="0 0 20 20">
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

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl shadow-xl px-8 py-6 text-center">
                <div className="w-9 h-9 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">{t('routing.calculatingOverlay')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('routing.calculatingSubtext')}</p>
              </div>
            </div>
          )}

          {/* Empty state hint */}
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

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
