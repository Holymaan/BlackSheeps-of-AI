import React, { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './FormPage.css'
import {
  FormDefinition,
  FormField as FormFieldDef,
  FieldType,
  FieldValue,
  AddressPoint,
  FormSubmission,
} from './examples/form-models'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

interface MapboxFeature {
  id: string
  place_name: string
  center: [number, number]
  text: string
}

/* ── Embedded form definition ───────────────────────────────────── */
const FORM: FormDefinition = {
  id: '3f1a7c9e-2b8d-4e6f-a1b2-c3d4e5f60718',
  title: 'Prijava djeteta za školski prijevoz',
  description: 'Usluga Grada Splita — prijavite dijete na školski prijevoz ŽutiBus.',
  version: 1,
  fields: [
    {
      key: 'parentOib',
      label: 'OIB roditelja',
      type: FieldType.Oib,
      required: true,
      placeholder: '12345678901',
      helpText: 'Hrvatski osobni identifikacijski broj — točno 11 znamenki.',
      validation: { pattern: '^\\d{11}$', minLength: 11, maxLength: 11, errorMessage: 'OIB mora imati točno 11 znamenki.' },
    },
    { key: 'name',      label: 'Ime',           type: FieldType.String, required: true, placeholder: 'Ivan'   },
    { key: 'lastName',  label: 'Prezime',        type: FieldType.String, required: true, placeholder: 'Horvat' },
    { key: 'childName',     label: 'Ime djeteta',                         type: FieldType.String,  required: true,  placeholder: 'Marko' },
    { key: 'childDisabled', label: 'Dijete s posebnim potrebama',         type: FieldType.Boolean, required: false, helpText: 'Označite ako dijete ima posebne potrebe ili teškoće u razvoju.' },
    {
      key: 'school',
      label: 'Škola',
      type: FieldType.Select,
      required: true,
      helpText: 'Odaberite školu djeteta.',
      options: [
        { id: 'os-ivana-gundulica',   displayName: 'OŠ Ivana Gundulića'   },
        { id: 'os-antuna-mihanovica', displayName: 'OŠ Antuna Mihanovića' },
        { id: 'os-augusta-senoe',     displayName: 'OŠ Augusta Šenoe'     },
      ],
    },
    { key: 'homeAddress', label: 'Kućna adresa', type: FieldType.AddressPoint, required: true },
    { key: 'gdprConsent', label: 'Suglasnost za obradu osobnih podataka', type: FieldType.Boolean, required: true, helpText: 'Slažem se s obradom osobnih podataka u svrhu pružanja usluge školskog prijevoza ŽutiBus, sukladno Uredbi (EU) 2016/679 (GDPR).' },
  ],
}

/* ── Validation ─────────────────────────────────────────────────── */
function validate(field: FormFieldDef, value: FieldValue): string | null {
  if (field.type === FieldType.AddressPoint) {
    const ap = value as AddressPoint | null
    if (field.required && (!ap || !ap.address)) return `Polje "${field.label}" je obavezno.`
    return null
  }
  if (field.type === FieldType.Boolean) {
    if (field.required && !value) return 'Prihvaćanje je obavezno za nastavak.'
    return null
  }
  const empty = value === null || value === '' || value === undefined
  if (field.required && empty) return `Polje "${field.label}" je obavezno.`
  if (empty) return null
  const v = field.validation
  if (!v || typeof value !== 'string') return null
  if (v.pattern && !new RegExp(v.pattern).test(value)) return v.errorMessage ?? 'Neispravan format.'
  if (v.minLength !== undefined && value.length < v.minLength) return v.errorMessage ?? `Minimalno ${v.minLength} znakova.`
  if (v.maxLength !== undefined && value.length > v.maxLength) return v.errorMessage ?? `Maksimalno ${v.maxLength} znakova.`
  return null
}

/* ── Shared error line ──────────────────────────────────────────── */
function ErrLine({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="fp-err">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
      </svg>
      {msg}
    </p>
  )
}

/* ── Address field ──────────────────────────────────────────────── */
function AddressField({
  value, onChange, error, hint,
}: {
  value: AddressPoint | null
  onChange: (v: AddressPoint | null) => void
  error?: string
  hint?: string
}) {
  const [addr, setAddr] = useState(value?.address ?? '')
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [open, setOpen] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [value?.lon ?? 16.4402, value?.lat ?? 43.5081],
      zoom: (value?.lat && value?.lon) ? 14 : 12,
      interactive: false,
    })
    mapRef.current = map
    if (value?.lat && value?.lon && !isNaN(value.lat) && !isNaN(value.lon)) {
      markerRef.current = new mapboxgl.Marker({ color: '#F5B800' })
        .setLngLat([value.lon, value.lat])
        .addTo(map)
    }
    return () => { map.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (value?.lat && value?.lon && !isNaN(value.lat) && !isNaN(value.lon)) {
      map.flyTo({ center: [value.lon, value.lat], zoom: 15, duration: 800 })
      if (markerRef.current) {
        markerRef.current.setLngLat([value.lon, value.lat])
      } else {
        markerRef.current = new mapboxgl.Marker({ color: '#F5B800' })
          .setLngLat([value.lon, value.lat])
          .addTo(map)
      }
    } else if (!value) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null }
      map.flyTo({ center: [16.4402, 43.5081], zoom: 12, duration: 800 })
    }
  }, [value])

  function handleInput(text: string) {
    setAddr(text)
    if (!text) { onChange(null); setSuggestions([]); setOpen(false); return }
    onChange({ address: text, lat: NaN, lon: NaN })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${mapboxgl.accessToken}&country=HR&language=hr&types=address,place&limit=5`
        )
        const data = await res.json()
        setSuggestions(data.features ?? [])
        setOpen((data.features?.length ?? 0) > 0)
      } catch { /* network error — silently skip */ }
    }, 300)
  }

  function selectSuggestion(feat: MapboxFeature) {
    const [lon, lat] = feat.center
    setAddr(feat.place_name)
    setSuggestions([])
    setOpen(false)
    onChange({ address: feat.place_name, lat, lon })
  }

  const errCls = error ? 'fp-input--err' : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Mapbox map — view only */}
      <div ref={mapContainerRef} className="fp-map"/>

      {/* Address input with autocomplete */}
      <div style={{ position: 'relative' }}>
        <div className="fp-input-wrap">
          <span className="fp-input-ico">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </span>
          <input
            className={`fp-input fp-input--ico ${errCls}`}
            type="text"
            placeholder="Marmontova 1, 21000 Split"
            value={addr}
            autoComplete="off"
            onChange={e => handleInput(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
        {open && suggestions.length > 0 && (
          <ul className="fp-suggestions">
            {suggestions.map(feat => (
              <li
                key={feat.id}
                className="fp-suggestion-item"
                onMouseDown={() => selectSuggestion(feat)}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>{feat.place_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hint && !error && <p className="fp-hint">{hint}</p>}
      <ErrLine msg={error}/>
    </div>
  )
}

/* ── Checkbox field ─────────────────────────────────────────────── */
function CheckboxField({
  label, value, onChange, error, hint, required,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  error?: string
  hint?: string
  required?: boolean
}) {
  return (
    <div className="fp-checkbox-field">
      <label className="fp-checkbox-row">
        <input
          type="checkbox"
          className="fp-checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="fp-checkbox-label">
          {label}
          {required && <span className="fp-required"> *</span>}
        </span>
      </label>
      {hint && !error && <p className="fp-hint fp-hint--indented">{hint}</p>}
      {error && <div className="fp-hint--indented"><ErrLine msg={error}/></div>}
    </div>
  )
}

/* ── Bus SVG icon ───────────────────────────────────────────────── */
function BusIcon({ size = 44 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56" fill="none" width={size} height={Math.round(size * 0.467)}>
      <rect x="4"  y="10" width="100" height="30" rx="6"   fill="#F5B800"/>
      <rect x="92" y="10" width="12"  height="30" rx="5"   fill="#E5A800"/>
      <rect x="93" y="14" width="10"  height="14" rx="2.5" fill="#93C5FD"/>
      <rect x="10" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="28" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="46" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="64" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="4"  y="32" width="100" height="3"  rx="1"   fill="#C8980A"/>
      <rect x="105" y="24" width="9"  height="9"  rx="2"   fill="#FEF08A"/>
      <rect x="5"  y="18" width="3"   height="14" rx="1.5" fill="#C8980A"/>
      <circle cx="22" cy="46" r="8"   fill="#1F2937"/>
      <circle cx="22" cy="46" r="3.5" fill="#F5B800"/>
      <circle cx="86" cy="46" r="8"   fill="#1F2937"/>
      <circle cx="86" cy="46" r="3.5" fill="#F5B800"/>
    </svg>
  )
}

/* ── Success screen ─────────────────────────────────────────────── */
function SuccessScreen({ sub, onReset }: { sub: FormSubmission; onReset: () => void }) {
  return (
    <div className="fp-success">
      <div className="fp-success-ring-wrap">
        <div className="fp-success-ring">
          <svg className="fp-success-check" width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div className="fp-success-star">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </div>
      </div>

      <div>
        <h2 className="fp-success-title">Prijava uspješno poslana!</h2>
        <p className="fp-success-sub">Vaše dijete je prijavljeno za školski prijevoz ŽutiBus.</p>
      </div>

      <div className="fp-success-card">
        <p className="fp-success-card-label">Referenca prijave</p>
        <div className="fp-success-row">
          <span className="fp-success-key">ID</span>
          <span className="fp-success-val fp-success-val--mono">{sub.submissionId.slice(0, 8)}…</span>
        </div>
        <div className="fp-success-row">
          <span className="fp-success-key">Poslano</span>
          <span className="fp-success-val">{new Date(sub.submittedAt).toLocaleString('hr-HR')}</span>
        </div>
        <div className="fp-success-row">
          <span className="fp-success-key">Verzija obrasca</span>
          <span className="fp-success-val">v{sub.formVersion}</span>
        </div>
      </div>

      <p className="fp-success-note">
        Primit ćete potvrdu e-mailom. Zadržite referentni ID za vlastitu evidenciju.
      </p>

      <button className="fp-reset-btn" onClick={onReset}>
        Pošalji novu prijavu
      </button>
    </div>
  )
}

/* ── Label helper ───────────────────────────────────────────────── */
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span className="fp-label">
      {text}
      {required && <span className="fp-required">*</span>}
    </span>
  )
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function FormPage() {
  const form = FORM

  const init = () => Object.fromEntries(form.fields.map(f => [f.key, f.defaultValue ?? null]))

  const [values,    setValues]    = useState<Record<string, FieldValue>>(init)
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [touched,   setTouched]   = useState<Record<string, boolean>>({})
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState<FormSubmission | null>(null)

  function set(key: string, val: FieldValue) {
    setValues(prev => ({ ...prev, [key]: val }))
    if (touched[key]) {
      const field = form.fields.find(f => f.key === key)!
      const err   = validate(field, val)
      setErrors(prev => ({ ...prev, [key]: err ?? '' }))
    }
  }

  function touch(key: string) {
    setTouched(prev => ({ ...prev, [key]: true }))
    const field = form.fields.find(f => f.key === key)!
    setErrors(prev => ({ ...prev, [key]: validate(field, values[key]) ?? '' }))
  }

  const filled = form.fields.filter(f => {
    const v = values[f.key]
    return v !== null && v !== ''
  }).length

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const newTouched = Object.fromEntries(form.fields.map(f => [f.key, true]))
    const newErrors  = Object.fromEntries(form.fields.map(f => [f.key, validate(f, values[f.key]) ?? '']))
    setTouched(newTouched)
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1300))
    setLoading(false)
    setSubmitted({
      formId: form.id, formVersion: form.version,
      submissionId: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      values,
    })
  }

  function reset() {
    setValues(init()); setErrors({}); setTouched({}); setSubmitted(null)
  }

  const err = (key: string) => (touched[key] ? errors[key] || undefined : undefined)
  const pct = form.fields.length === 0 ? 0 : Math.round((filled / form.fields.length) * 100)

  return (
    <div className="fp-root">
      {/* Aurora background */}
      <div className="fp-aurora">
        <div className="fp-blob fp-blob-1"/>
        <div className="fp-blob fp-blob-2"/>
        <div className="fp-blob fp-blob-3"/>
        <div className="fp-blob fp-blob-4"/>
        <div className="fp-blob fp-blob-5"/>
      </div>
      <div className="fp-grid"/>

      <div className="fp-page">
        {/* Header — co-branded Grad Split × ŽutiBus */}
        <div className="fp-header">
          <div className="fp-cobrand">
            {/* Grad Split side */}
            <div className="fp-split-logo-wrap">
              <img
                src="https://split.hr/Portals/0/logo-white.svg"
                alt="Grad Split"
                className="fp-split-logo"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <span className="fp-split-name">Grad Split</span>
            </div>

            {/* Divider */}
            <div className="fp-cobrand-divider"/>

            {/* ŽutiBus side */}
            <div className="fp-logo-row">
              <BusIcon size={52}/>
              <div className="fp-logo-text">
                <span className="fp-logo-name"><span>Žuti</span>Bus</span>
                <span className="fp-logo-sub">Split</span>
              </div>
            </div>
          </div>

          {/* Civic tagline */}
          <div className="fp-tagline">
            <span>Digitalne usluge</span>
            <span className="fp-tagline-dot"/>
            <span>Grad Split</span>
            <span className="fp-tagline-dot"/>
            <span>e-Uprava</span>
          </div>
        </div>

        {/* Card */}
        <div className="fp-card">
          <div className="fp-card-stripe"/>

          {/* Card head */}
          <div className="fp-card-head">
            <div>
              <h1 className="fp-card-title">{form.title}</h1>
              <p className="fp-card-desc">{form.description}</p>
            </div>
            <div className="fp-version-pill">
              <span className="fp-version-dot"/>
              v{form.version}
            </div>
          </div>

          {submitted ? (
            <SuccessScreen sub={submitted} onReset={reset}/>
          ) : (
            <form onSubmit={submit} noValidate>
              {/* Progress */}
              <div className="fp-progress">
                <div className="fp-progress-track">
                  <div className="fp-progress-fill" style={{ width: `${pct}%` }}/>
                </div>
                <span className="fp-progress-count">{filled}/{form.fields.length}</span>
              </div>

              {/* Fields */}
              <div className="fp-body">

                {/* ── Section: Parent ── */}
                <div className="fp-section">
                  <span className="fp-section-line"/>
                  <span className="fp-section-text">Podaci o roditelju</span>
                  <span className="fp-section-line"/>
                </div>

                {/* OIB */}
                <div className="fp-field">
                  <Label text="OIB roditelja" required/>
                  <div className="fp-input-wrap">
                    <span className="fp-input-ico">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2"/>
                      </svg>
                    </span>
                    <input
                      id="parentOib"
                      className={`fp-input fp-input--ico ${err('parentOib') ? 'fp-input--err' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="12345678901"
                      value={(values.parentOib as string) ?? ''}
                      onChange={e => set('parentOib', e.target.value)}
                      onBlur={() => touch('parentOib')}
                    />
                  </div>
                  {err('parentOib')
                    ? <ErrLine msg={err('parentOib')}/>
                    : <p className="fp-hint">Hrvatski OIB — točno 11 znamenki.</p>
                  }
                </div>

                {/* Name | Last name */}
                <div className="fp-row">
                  {(['name', 'lastName'] as const).map(key => {
                    const field = form.fields.find(f => f.key === key)!
                    return (
                      <div key={key} className="fp-field">
                        <Label text={field.label} required={field.required}/>
                        <div className="fp-input-wrap">
                          <input
                            className={`fp-input ${err(key) ? 'fp-input--err' : ''}`}
                            type="text"
                            placeholder={field.placeholder}
                            value={(values[key] as string) ?? ''}
                            onChange={e => set(key, e.target.value)}
                            onBlur={() => touch(key)}
                          />
                        </div>
                        <ErrLine msg={err(key)}/>
                      </div>
                    )
                  })}
                </div>

                {/* ── Section: Child ── */}
                <div className="fp-section">
                  <span className="fp-section-line"/>
                  <span className="fp-section-text">Podaci o djetetu</span>
                  <span className="fp-section-line"/>
                </div>

                {/* Child name */}
                <div className="fp-field">
                  <Label text="Ime djeteta" required/>
                  <div className="fp-input-wrap">
                    <span className="fp-input-ico">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </span>
                    <input
                      className={`fp-input fp-input--ico ${err('childName') ? 'fp-input--err' : ''}`}
                      type="text"
                      placeholder="Marko"
                      value={(values.childName as string) ?? ''}
                      onChange={e => set('childName', e.target.value)}
                      onBlur={() => touch('childName')}
                    />
                  </div>
                  <ErrLine msg={err('childName')}/>
                </div>

                {/* Child disabled */}
                <CheckboxField
                  label="Dijete s posebnim potrebama"
                  value={(values.childDisabled as boolean) ?? false}
                  onChange={v => { set('childDisabled', v); touch('childDisabled') }}
                  error={err('childDisabled')}
                  hint="Označite ako dijete ima posebne potrebe ili teškoće u razvoju."
                />

                {/* ── Section: Transport ── */}
                <div className="fp-section">
                  <span className="fp-section-line"/>
                  <span className="fp-section-text">Škola i prijevoz</span>
                  <span className="fp-section-line"/>
                </div>

                {/* School select */}
                <div className="fp-field">
                  <Label text="Škola" required/>
                  <div className="fp-input-wrap">
                    <span className="fp-input-ico">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                      </svg>
                    </span>
                    <select
                      className={`fp-input fp-input--ico fp-select ${err('school') ? 'fp-input--err' : ''}`}
                      value={(values.school as string) ?? ''}
                      onChange={e => { set('school', e.target.value); touch('school') }}
                    >
                      <option value="" disabled>Odaberite školu…</option>
                      {form.fields.find(f => f.key === 'school')?.options?.map(o => (
                        <option key={o.id} value={o.id}>{o.displayName}</option>
                      ))}
                    </select>
                    <span className="fp-select-arrow">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </span>
                  </div>
                  {err('school')
                    ? <ErrLine msg={err('school')}/>
                    : <p className="fp-hint">Odaberite školu djeteta.</p>
                  }
                </div>

                {/* Home address */}
                <div className="fp-field">
                  <Label text="Kućna adresa" required/>
                  <AddressField
                    value={values.homeAddress as AddressPoint | null}
                    onChange={val => { set('homeAddress', val); touch('homeAddress') }}
                    error={err('homeAddress')}
                  />
                </div>

                {/* ── Section: GDPR ── */}
                <div className="fp-section">
                  <span className="fp-section-line"/>
                  <span className="fp-section-text">Suglasnost</span>
                  <span className="fp-section-line"/>
                </div>

                {/* GDPR consent */}
                <CheckboxField
                  label="Prihvaćam obradu osobnih podataka"
                  value={(values.gdprConsent as boolean) ?? false}
                  onChange={v => { set('gdprConsent', v); touch('gdprConsent') }}
                  error={err('gdprConsent')}
                  hint="Slažem se s obradom osobnih podataka u svrhu pružanja usluge školskog prijevoza ŽutiBus, sukladno Uredbi (EU) 2016/679 (GDPR)."
                  required
                />
              </div>

              {/* Footer */}
              <div className="fp-foot">
                {Object.values(errors).some(Boolean) && Object.values(touched).some(Boolean) && (
                  <div className="fp-err-banner">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                    </svg>
                    Ispravite greške iznad prije slanja.
                  </div>
                )}

                <button type="submit" className="fp-submit" disabled={loading}>
                  {loading
                    ? <><div className="fp-spinner"/> Slanje…</>
                    : <>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Pošalji prijavu
                      </>
                  }
                </button>

                <p className="fp-terms">
                  Slanjem potvrđujete da ste pročitali i prihvatili{' '}
                  <a href="#">Uvjete korištenja</a> i <a href="#">Politiku privatnosti</a> ŽutiBus usluge.
                </p>
              </div>
            </form>
          )}
        </div>

        <div className="fp-page-foot">
          <span>&copy; {new Date().getFullYear()} ŽutiBus Split · Grad Split digitalna usluga</span>
          <div className="fp-page-foot-civic">
            <div className="fp-page-foot-flag">
              <div className="fp-flag-blue"/>
              <div className="fp-flag-white"/>
              <div className="fp-flag-red"/>
            </div>
            <span>Republika Hrvatska · Splitsko-dalmatinska županija</span>
          </div>
        </div>
      </div>
    </div>
  )
}
