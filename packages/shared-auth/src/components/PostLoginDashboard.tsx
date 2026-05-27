import { useNavigate } from 'react-router-dom'
import { Building2, Gavel, LogOut, ShieldCheck, Truck, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'
import type { ERPModule } from '../types'

export function PostLoginDashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const isAllAccess = Boolean(user?.permissions.includes('all'))

  const modules: Array<{ key: ERPModule; label: string; path: string; icon: typeof ShieldCheck }> = [
    { key: 'platform-admin', label: 'Platform Admin', path: '/platform-admin/dashboard', icon: ShieldCheck },
    { key: 'tenant-admin', label: 'Tenant Admin', path: '/tenant-admin/dashboard', icon: Building2 },
    { key: 'tms', label: 'TMS Booking', path: '/tms/booking/bookings', icon: Truck },
    { key: 'vendor', label: 'Vendor', path: '/vendor', icon: Users },
    { key: 'fleet', label: 'Fleet', path: '/fleet/dashboard', icon: Truck },
    { key: 'ams', label: 'Auction', path: '/auction/dashboard', icon: Gavel },
  ].filter((module) => isAllAccess || Boolean(user?.modules.includes(module.key)))

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-text">
      <section className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <OptimileLogo className="mx-auto text-primary" style={{ height: 36, width: 'auto', display: 'block' }} />
        <p className="mt-8 text-sm font-bold uppercase tracking-wide text-accent">Optimile ERP</p>
        <h1 className="mt-2 text-3xl font-extrabold text-text">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-3 text-sm text-gray-600">Choose a module workspace.</p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => navigate(module.path)}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-text">{module.label}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-primary transition hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </section>
    </main>
  )
}
