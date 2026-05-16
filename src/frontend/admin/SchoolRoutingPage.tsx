import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  listSchools,
  getSchoolRoute,
  type SchoolSummary,
  type SchoolRouteResponse,
} from '../api/client'
import { useTranslation } from 'react-i18next'

// Split, Croatia
const DEFAULT_CENTER: [number, number] = [16.44, 43.508]
const DEFAULT_ZOOM = 12

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`
}

/** Flatten all legs into a single coordinate array for animation. */
function flattenLegs(legs: number[][][]): number[][] {
  return legs.flatMap(leg => leg)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchoolRoutingPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapReadyRef = useRef(false)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const animFrameRef = useRef<number>(0)
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
    for (const id of ['route-layer', 'route-glow']) {
      if (map.getLayer(id)) map.removeLayer(id)
    }
    for (const id of ['route-source', 'route-anim']) {
      if (map.getSource(id)) map.removeSource(id)
    }
    if (map.getLayer('bus-dot')) map.removeLayer('bus-dot')
    if (map.getSource('bus-dot')) map.removeSource('bus-dot')
  }, [])

  // ── Animate route drawing ──────────────────────────────────────────────────
  const animateRoute = useCallback((map: maplibregl.Map, allCoords: number[][]) => {
    // Source for the progressively drawn line
    const animData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: allCoords.slice(0, 1) },
        properties: {},
      }],
    }

    map.addSource('route-anim', { type: 'geojson', data: animData })

    // Glow layer (wide, semi-transparent)
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route-anim',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#3b82f6', 'line-width': 10, 'line-opacity': 0.2 },
    })

    // Main route line
    map.addLayer({
      id: 'route-layer',
      type: 'line',
      source: 'route-anim',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#1e3a5f', 'line-width': 4, 'line-opacity': 0.9 },
    })

    // Moving bus dot
    const busData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: allCoords[0] },
        properties: {},
      }],
    }
    map.addSource('bus-dot', { type: 'geojson', data: busData })
    map.addLayer({
      id: 'bus-dot',
      type: 'circle',
      source: 'bus-dot',
      paint: {
        'circle-radius': 7,
        'circle-color': '#F59E0B',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    })

    // Progressive animation
    const total = allCoords.length
    const duration = 3000 // ms
    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // Ease-out for a smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const idx = Math.min(Math.floor(eased * total), total - 1)

      const slice = allCoords.slice(0, idx + 1)
      const src = map.getSource('route-anim') as maplibregl.GeoJSONSource | undefined
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: slice },
            properties: {},
          }],
        })
      }

      // Move bus dot
      const busSrc = map.getSource('bus-dot') as maplibregl.GeoJSONSource | undefined
      if (busSrc) {
        busSrc.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: allCoords[idx] },
            properties: {},
          }],
        })
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        // Animation done — remove bus dot, keep route
        if (map.getLayer('bus-dot')) map.removeLayer('bus-dot')
        if (map.getSource('bus-dot')) map.removeSource('bus-dot')
      }
    }

    animFrameRef.current = requestAnimationFrame(step)
  }, [])

  // ── Render result on map ────────────────────────────────────────────────────
  const renderOnMap = useCallback((data: SchoolRouteResponse) => {
    const map = mapRef.current
    if (!map) return

    const bounds = new maplibregl.LngLatBounds()

    // Bus stop markers — yellow circles numbered 1…N
    data.busStops.forEach((stop, i) => {
      const el = document.createElement('div')
      Object.assign(el.style, {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        background: '#F59E0B',
        border: '3px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#1a1a1a',
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
               ${t('routing.students')}: ${stop.studentCount} &middot;
               ${t('routing.arrival')}: ${stop.estimatedArrivalMin} min
             </p>
             <ul style="margin:4px 0 0;padding-left:16px;font-size:11px;color:#666">${studentList}</ul>`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([stop.lon, stop.lat])
    })

    // School marker — red circle with a graduation-cap SVG
    const schoolEl = document.createElement('div')
    Object.assign(schoolEl.style, {
      width: '34px',
      height: '34px',
      borderRadius: '50%',
      background: '#EF4444',
      border: '3px solid #fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    })
    schoolEl.innerHTML = `
      <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>`

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

    // Fit bounds first, then animate route
    const allCoords = flattenLegs(data.route.legs)
    allCoords.forEach(([lon, lat]) => bounds.extend([lon, lat]))

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 800 })
    }

    map.resize()

    // Start animation after fitBounds settles
    setTimeout(() => {
      if (allCoords.length > 1) animateRoute(map, allCoords)
    }, 900)
  }, [t, animateRoute])

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

              {/* Bus stop list */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t('routing.pickupStops', { count: result.busStops.length })}
                </h3>
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
                  {result.busStops.map((stop, i) => (
                    <div key={i} className="rounded-lg bg-amber-50 border border-amber-100 text-xs overflow-hidden">
                      {/* Stop header — clickable */}
                      <button
                        onClick={() => toggleStop(i)}
                        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-amber-100/50 transition"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center font-bold text-gray-900 shrink-0 mt-0.5">
                          {i + 1}
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
                          <span className="bg-amber-200 text-amber-800 font-bold rounded-full px-1.5 py-0.5 text-[10px]">
                            {stop.studentCount}
                          </span>
                          <svg
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedStops.has(i) ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded student list */}
                      {expandedStops.has(i) && (
                        <div className="px-3 pb-2 pt-0 border-t border-amber-100">
                          <ul className="mt-1.5 space-y-0.5">
                            {stop.studentNames.map((name, j) => (
                              <li key={j} className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
