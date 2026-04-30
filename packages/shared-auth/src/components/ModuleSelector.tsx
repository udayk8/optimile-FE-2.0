import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Users, Package, MapPin, DollarSign,
  Gavel, Building2, BarChart3, LogOut, ShieldCheck, UserCog,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAccessibleModules, MODULE_ROUTES } from '../moduleRoutes'
import { type ERPModule } from '../types'
import { OptimileLogo } from './OptimileLogo'

interface ModuleDefinition {
  id: ERPModule
  label: string
  description: string
  icon: React.ElementType
  available: boolean
}

const MODULE_ICONS: Record<ERPModule, React.ElementType> = {
  admin: UserCog,
  ams: Gavel,
  fleet: Truck,
  vendor: Building2,
  customer: Users,
  driver: ShieldCheck,
  tms: Package,
  tracking: MapPin,
  finance: DollarSign,
  reporting: BarChart3,
  ptl: LayoutDashboard,
}

export function ModuleSelector() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const accessible: ModuleDefinition[] = getAccessibleModules(user).map((module) => ({
    ...module,
    icon: MODULE_ICONS[module.id],
  }))
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleSelect = (mod: ModuleDefinition) => {
    if (!mod.available) return
    navigate(MODULE_ROUTES[mod.id])
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <OptimileLogo
            className="text-primary"
            style={{ height: 28, width: 'auto', display: 'block' }}
          />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-danger"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-10 sm:px-6 lg:px-8 max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-accent mb-1">Optimile ERP</p>
          <h1 className="text-2xl font-extrabold text-text">Select a module</h1>
          <p className="mt-2 text-sm text-gray-500">
            You have access to {accessible.length} module{accessible.length !== 1 ? 's' : ''}. Choose where to go.
          </p>
        </div>

        {/* Modules the user can access */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accessible.map(mod => {
            const Icon = mod.icon
            return (
              <button
                key={mod.id}
                onClick={() => handleSelect(mod)}
                disabled={!mod.available}
                className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-left transition hover:shadow-card-hover hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0 transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-text">{mod.label}</p>
                      {!mod.available && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">{mod.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Modules coming soon that user has access to */}
        {accessible.some(m => !m.available) && (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Coming soon</p>
            <div className="flex flex-wrap gap-2">
              {accessible.filter(m => !m.available).map(mod => {
                const Icon = mod.icon
                return (
                  <div key={mod.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                    <Icon className="h-3.5 w-3.5" />
                    {mod.label}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
