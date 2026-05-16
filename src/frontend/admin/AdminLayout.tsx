import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../LanguageSwitcher'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
    isActive
      ? 'bg-white/15 text-white font-medium'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`

export default function AdminLayout() {
  const { isAuthenticated, username, logout } = useAuth()
  const { t } = useTranslation()

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-bus-navy flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="font-display text-lg font-bold text-white">{t('login.title')}</h1>
          <p className="text-xs text-white/50 mt-1">{t('login.subtitle')}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/admin" end className={navLinkClass}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {t('nav.projects')}
          </NavLink>
          <NavLink to="/admin/projects/new" className={navLinkClass}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('nav.newProject')}
          </NavLink>
          <NavLink to="/admin/routing" className={navLinkClass}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {t('nav.routePlanner')}
          </NavLink>
        </nav>

        <div className="px-6 py-4 border-t border-white/10 space-y-2">
          <p className="text-xs text-white/60">{username}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="text-xs text-white/40 hover:text-white transition"
            >
              {t('nav.signOut')}
            </button>
            <LanguageSwitcher className="text-white/50" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
