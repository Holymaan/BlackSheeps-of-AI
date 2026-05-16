import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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
  value, onChange, error,
}: {
  value: AddressPoint | null
  onChange: (v: AddressPoint | null) => void
  error?: string
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
      } catch { /* silently skip */ }
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
      <div ref={mapContainerRef} className="fp-map"/>
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
              <li key={feat.id} className="fp-suggestion-item" onMouseDown={() => selectSuggestion(feat)}>
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

/* ── Label helper ───────────────────────────────────────────────── */
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span className="fp-label">
      {text}
      {required && <span className="fp-required">*</span>}
    </span>
  )
}

/* ── Generic field renderer ─────────────────────────────────────── */
function FieldRenderer({ field, value, error, set, touch }: {
  field: FormFieldDef
  value: FieldValue
  error: string | undefined
  set: (val: FieldValue) => void
  touch: (val?: FieldValue) => void
}) {
  const errCls = error ? 'fp-input--err' : ''

  if (field.type === FieldType.Boolean) {
    return (
      <CheckboxField
        label={field.label}
        value={(value as boolean) ?? false}
        onChange={v => { set(v); touch(v) }}
        error={error}
        hint={field.helpText}
        required={field.required}
      />
    )
  }

  if (field.type === FieldType.AddressPoint) {
    return (
      <div className="fp-field">
        <Label text={field.label} required={field.required}/>
        <AddressField
          value={value as AddressPoint | null}
          onChange={v => { set(v); touch(v) }}
          error={error}
        />
      </div>
    )
  }

  if (field.type === FieldType.Select) {
    return (
      <div className="fp-field">
        <Label text={field.label} required={field.required}/>
        <div className="fp-input-wrap">
          <select
            className={`fp-input fp-select ${errCls}`}
            value={(value as string) ?? ''}
            onChange={e => { set(e.target.value); touch(e.target.value) }}
          >
            <option value="" disabled>Odaberite…</option>
            {field.options?.map(o => (
              <option key={o.id} value={o.id}>{o.displayName}</option>
            ))}
          </select>
          <span className="fp-select-arrow">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </span>
        </div>
        {error ? <ErrLine msg={error}/> : field.helpText && <p className="fp-hint">{field.helpText}</p>}
      </div>
    )
  }

  // String, OIB, Email, Number
  const isNumber = field.type === FieldType.Number
  return (
    <div className="fp-field">
      <Label text={field.label} required={field.required}/>
      <div className="fp-input-wrap">
        <input
          className={`fp-input ${errCls}`}
          type={isNumber ? 'number' : 'text'}
          inputMode={field.type === FieldType.Oib ? 'numeric' : isNumber ? 'decimal' : undefined}
          placeholder={field.placeholder}
          maxLength={field.validation?.maxLength}
          value={(value as string | number) ?? ''}
          onChange={e => set(isNumber ? parseFloat(e.target.value) : e.target.value)}
          onBlur={() => touch()}
        />
      </div>
      {error ? <ErrLine msg={error}/> : field.helpText && <p className="fp-hint">{field.helpText}</p>}
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

/* ── Main page ──────────────────────────────────────────────────── */
export default function FormPage() {
  const { id } = useParams<{ id: string }>()

  const [form,        setForm]        = useState<FormDefinition | null>(null)
  const [formLoading, setFormLoading] = useState(true)
  const [formError,   setFormError]   = useState<string | null>(null)

  const [values,      setValues]      = useState<Record<string, FieldValue>>({})
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [touched,     setTouched]     = useState<Record<string, boolean>>({})
  const [loading,     setLoading]     = useState(false)
  const [submitted,   setSubmitted]   = useState<FormSubmission | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setFormLoading(true)
    setFormError(null)
    fetch(`/form/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Obrazac nije pronađen.' : `Greška servera: ${r.status}`)
        return r.json()
      })
      .then((data: FormDefinition) => {
        setForm(data)
        setValues(Object.fromEntries(data.fields.map(f => [f.key, f.defaultValue ?? null])))
        setErrors({})
        setTouched({})
        setSubmitted(null)
      })
      .catch(e => setFormError(e instanceof Error ? e.message : 'Greška pri učitavanju obrasca.'))
      .finally(() => setFormLoading(false))
  }, [id])

  function set(key: string, val: FieldValue) {
    if (!form) return
    setValues(prev => ({ ...prev, [key]: val }))
    if (touched[key]) {
      const field = form.fields.find(f => f.key === key)!
      setErrors(prev => ({ ...prev, [key]: validate(field, val) ?? '' }))
    }
  }

  function touch(key: string, val?: FieldValue) {
    if (!form) return
    setTouched(prev => ({ ...prev, [key]: true }))
    const field = form.fields.find(f => f.key === key)!
    const v = val !== undefined ? val : values[key]
    setErrors(prev => ({ ...prev, [key]: validate(field, v) ?? '' }))
  }

  const filled = form
    ? form.fields.filter(f => { const v = values[f.key]; return v !== null && v !== '' && v !== undefined }).length
    : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const newTouched = Object.fromEntries(form.fields.map(f => [f.key, true]))
    const newErrors  = Object.fromEntries(form.fields.map(f => [f.key, validate(f, values[f.key]) ?? '']))
    setTouched(newTouched)
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/form/${form.id}/submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formVersion: form.version, values }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Greška servera: ${res.status}`)
      }
      setSubmitted(await res.json())
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nepoznata greška. Pokušajte ponovo.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    if (!form) return
    setValues(Object.fromEntries(form.fields.map(f => [f.key, f.defaultValue ?? null])))
    setErrors({})
    setTouched({})
    setSubmitted(null)
  }

  const err = (key: string) => (touched[key] ? errors[key] || undefined : undefined)
  const pct = form && form.fields.length > 0 ? Math.round((filled / form.fields.length) * 100) : 0

  return (
    <div className="fp-root">
      <div className="fp-aurora">
        <div className="fp-blob fp-blob-1"/>
        <div className="fp-blob fp-blob-2"/>
        <div className="fp-blob fp-blob-3"/>
        <div className="fp-blob fp-blob-4"/>
        <div className="fp-blob fp-blob-5"/>
      </div>
      <div className="fp-grid"/>

      <div className="fp-page">
        {/* Header */}
        <div className="fp-header">
          <div className="fp-cobrand">
            <div className="fp-split-logo-wrap">
              <img
                src="https://split.hr/Portals/0/logo-white.svg"
                alt="Grad Split"
                className="fp-split-logo"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <span className="fp-split-name">Grad Split</span>
            </div>
            <div className="fp-cobrand-divider"/>
            <div className="fp-logo-row">
              <BusIcon size={52}/>
              <div className="fp-logo-text">
                <span className="fp-logo-name"><span>Žuti</span>Bus</span>
                <span className="fp-logo-sub">Split</span>
              </div>
            </div>
          </div>
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

          {formLoading && (
            <div className="fp-card-state">
              <div className="fp-spinner fp-spinner--lg"/>
              <span>Učitavanje obrasca…</span>
            </div>
          )}

          {formError && (
            <div className="fp-card-state fp-card-state--err">
              <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <p>{formError}</p>
            </div>
          )}

          {form && !formLoading && (submitted ? (
            <SuccessScreen sub={submitted} onReset={reset}/>
          ) : (
            <>
              <div className="fp-card-head">
                <div>
                  <h1 className="fp-card-title">{form.title}</h1>
                  {form.description && <p className="fp-card-desc">{form.description}</p>}
                </div>
                <div className="fp-version-pill">
                  <span className="fp-version-dot"/>
                  v{form.version}
                </div>
              </div>

              <form onSubmit={submit} noValidate>
                <div className="fp-progress">
                  <div className="fp-progress-track">
                    <div className="fp-progress-fill" style={{ width: `${pct}%` }}/>
                  </div>
                  <span className="fp-progress-count">{filled}/{form.fields.length}</span>
                </div>

                <div className="fp-body">
                  {form.fields.map(field => (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? null}
                      error={err(field.key)}
                      set={val => set(field.key, val)}
                      touch={val => touch(field.key, val)}
                    />
                  ))}
                </div>

                <div className="fp-foot">
                  {Object.values(errors).some(Boolean) && Object.values(touched).some(Boolean) && (
                    <div className="fp-err-banner">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                      </svg>
                      Ispravite greške iznad prije slanja.
                    </div>
                  )}
                  {submitError && (
                    <div className="fp-err-banner">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                      </svg>
                      {submitError}
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
            </>
          ))}
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
