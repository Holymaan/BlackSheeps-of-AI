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

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchoolRoutingPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapReadyRef = useRef(false)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const { t } = useTranslation()

  const [schools, setSchools] = useState<SchoolSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [result, setResult] = useState<SchoolRouteResponse | null>(null)

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
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (map.getLayer('route-layer')) map.removeLayer('route-layer')
    if (map.getSource('route-source')) map.removeSource('route-source')
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

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lon, stop.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14 }).setHTML(
            `<p style="margin:0;font-weight:600">${t('routing.stop', { number: i + 1 })}</p>
             <p style="margin:2px 0 0;font-size:12px;color:#555">
               ${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}
             </p>`
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

    // Route polyline — one GeoJSON LineString per Valhalla leg
    if (data.route.legs.length > 0) {
      const features = data.route.legs.map(coords => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: coords },
        properties: {},
      }))

      data.route.legs.forEach(coords =>
        coords.forEach(([lon, lat]) => bounds.extend([lon, lat]))
      )

      // Wait for style to be loaded before touching sources/layers
      const addRoute = () => {
        if (!mapRef.current) return
        mapRef.current.addSource('route-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        })
        mapRef.current.addLayer(
          {
            id: 'route-layer',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#1e3a5f', 'line-width': 4, 'line-opacity': 0.85 },
          }
        )
      }

      if (mapReadyRef.current) {
        addRoute()
      } else {
        map.once('load', addRoute)
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 800 })
    }
  }, [t])

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

    try {
      const data = await getSchoolRoute(Number(selectedId))
      setResult(data)
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : t('routing.routeError'))
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
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
            <div className="space-y-5">

              {/* Summary cards */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('routing.summary')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label={t('routing.busStops')} value={String(result.busStops.length)} />
                  <StatCard label={t('routing.travelTime')} value={formatTime(result.route.timeSec)} />
                  <div className="col-span-2">
                    <StatCard label={t('routing.distance')} value={`${result.route.lengthKm.toFixed(1)} km`} />
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
                <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
                  {result.busStops.map((stop, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center font-bold text-gray-900 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-gray-600 tabular-nums">
                        {stop.lat.toFixed(5)},&nbsp;{stop.lon.toFixed(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </aside>

        {/* ── Map ── */}
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="absolute inset-0" />

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

// ── Sub-component ─────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
