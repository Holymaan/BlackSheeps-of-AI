import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicForms, type PublicFormSummary } from './api/client'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import './LandingPage.css'

function BusIcon({ size = 52 }: { size?: number }) {
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

export default function LandingPage() {
  const { t } = useTranslation()
  const [forms, setForms] = useState<PublicFormSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    listPublicForms()
      .then(setForms)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="lp-root">
      {/* Aurora background */}
      <div className="lp-aurora">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
        <div className="lp-blob lp-blob-4" />
        <div className="lp-blob lp-blob-5" />
      </div>
      <div className="lp-grid" />

      <div className="lp-page">
        {/* ── Navbar ── */}
        <header className="lp-nav">
          <div className="lp-nav-inner">
            <div className="lp-cobrand">
              <div className="lp-split-logo-wrap">
                <img
                  src="https://split.hr/Portals/0/logo-white.svg"
                  alt="Grad Split"
                  className="lp-split-logo"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <span className="lp-split-name">Grad Split</span>
              </div>
              <div className="lp-cobrand-divider" />
              <div className="lp-logo-row">
                <BusIcon size={44} />
                <div className="lp-logo-text">
                  <span className="lp-logo-name"><span>Žuti</span>Bus</span>
                  <span className="lp-logo-sub">Split</span>
                </div>
              </div>
            </div>
            <div className="lp-nav-right">
              <div className="lp-tagline">
                <span>{t('landing.taglineServices')}</span>
                <span className="lp-tagline-dot" />
                <span>{t('landing.taglineEGov')}</span>
              </div>
              <LanguageSwitcher className="text-gray-500" />
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero-badge">{t('landing.badge')}</div>
          <h1 className="lp-hero-title">{t('landing.heroTitle')}</h1>
          <p className="lp-hero-sub">{t('landing.heroSub')}</p>
          <div className="lp-hero-stats">
            <div className="lp-stat">
              <span className="lp-stat-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </span>
              <span className="lp-stat-label">{t('landing.statCitizens')}</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <span className="lp-stat-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </span>
              <span className="lp-stat-label">{t('landing.statSecure')}</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <span className="lp-stat-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
              <span className="lp-stat-label">{t('landing.statFast')}</span>
            </div>
          </div>
        </section>

        {/* ── Forms grid ── */}
        <section className="lp-forms">
          <h2 className="lp-forms-title">{t('landing.formsTitle')}</h2>

          {loading && (
            <div className="lp-forms-state">
              <div className="lp-spinner" />
              <span>{t('landing.loading')}</span>
            </div>
          )}

          {error && (
            <div className="lp-forms-state lp-forms-state--err">
              <span>{t('landing.loadError')}</span>
            </div>
          )}

          {!loading && !error && forms.length === 0 && (
            <div className="lp-forms-state">
              <span>{t('landing.noForms')}</span>
            </div>
          )}

          {forms.length > 0 && (
            <div className="lp-forms-grid">
              {forms.map((form, i) => (
                <Link key={form.id} to={`/prijava/${form.id}`} className="lp-card" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="lp-card-stripe" />
                  <div className="lp-card-body">
                    <div className="lp-card-icon">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="lp-card-title">{form.title}</h3>
                    {form.description && (
                      <p className="lp-card-desc">{form.description}</p>
                    )}
                    <span className="lp-card-cta">
                      {t('landing.openForm')}
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="lp-footer">
          <span>{t('landing.footer', { year: new Date().getFullYear() })}</span>
          <div className="lp-footer-civic">
            <div className="lp-footer-flag">
              <div className="lp-flag-blue" />
              <div className="lp-flag-white" />
              <div className="lp-flag-red" />
            </div>
            <span>{t('landing.footerCivic')}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
