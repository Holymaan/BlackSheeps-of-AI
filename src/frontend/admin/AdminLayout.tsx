import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
    isActive
      ? 'bg-white/15 text-white font-medium'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`

export default function AdminLayout() {
  const { isAuthenticated, username, logout } = useAuth()

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-bus-navy flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="font-display text-lg font-bold text-white">ŽutiBus Admin</h1>
          <p className="text-xs text-white/50 mt-1">Grad Split · e-Uprava</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/admin" end className={navLinkClass}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Projects
          </NavLink>
          <NavLink to="/admin/projects/new" className={navLinkClass}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </NavLink>
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 mb-2">{username}</p>
          <button
            onClick={logout}
            className="text-xs text-white/40 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
