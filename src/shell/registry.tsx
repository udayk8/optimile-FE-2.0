import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Navigate, Route, useNavigate } from 'react-router-dom'
import { ProtectedRoute, useAuth, OptimileLogo, getPostLoginRouteForUser } from '@shared-auth'
import { ShellAppShell, type ModuleManifest } from '@shared-ui'
import { vendorManifest } from '@vendor/app/manifest'
import { auctionManifest } from '@auction/app/manifest'
import { fleetManifest } from '@fleet/app/manifest'
import { platformAdminManifest } from '@platform-admin/app/manifest'
import { tenantAdminManifest } from '@tenant-admin/app/manifest'
import { tmsBookingManifest } from '@tms-booking/app/manifest'

export const MODULES: ModuleManifest[] = [
  platformAdminManifest,
  tenantAdminManifest,
  tmsBookingManifest,
  vendorManifest,
  auctionManifest,
  fleetManifest,
]

/** manifest.key → ERPModule code on user.modules */
const MODULE_KEY_TO_ERP: Record<string, string> = {
  fleet: 'fleet',
  auction: 'ams',
  vendor: 'vendor',
  'platform-admin': 'platform-admin',
  'tenant-admin': 'tenant-admin',
  'tms-booking': 'tms',
}

function filterModulesForUser(
  modules: ModuleManifest[],
  user: { permissions: string[]; modules: string[] } | null,
): ModuleManifest[] {
  if (!user) return []
  if (user.permissions.includes('all')) return modules
  return modules.filter((m) => {
    const erp = MODULE_KEY_TO_ERP[m.key]
    return erp ? user.modules.includes(erp) : false
  })
}

const LANDING_PATH = '/platform-admin/dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function applyWrapper(element: ReactNode, Wrapper?: ModuleManifest['wrapper']): ReactNode {
  if (!Wrapper) return element
  return <Wrapper>{element}</Wrapper>
}

function ShellWithAuth() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }
  const visibleModules = filterModulesForUser(
    MODULES,
    user ? { permissions: user.permissions, modules: user.modules } : null,
  )
  return (
    <ShellAppShell
      modules={visibleModules}
      user={user ? { name: user.name, email: user.email, role: user.role } : null}
      onLogout={onLogout}
      logo={<OptimileLogo className="text-white" style={{ height: 40, width: 'auto' }} />}
      footer={
        <>
          <p className="text-[11px] text-gray-400">© 2025 Optimile ERP</p>
          <p className="text-[11px] text-gray-400">v1.0.0</p>
        </>
      }
    />
  )
}

export function ShellLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProtectedRoute>
        <ShellWithAuth />
      </ProtectedRoute>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}

function ShellIndexRedirect() {
  const { user } = useAuth()
  return <Navigate to={getPostLoginRouteForUser(user)} replace />
}

export function buildShellChildRoutes() {
  return (
    <>
      <Route index element={<ShellIndexRedirect />} />
      {MODULES.map((manifest) => (
        <Route key={manifest.key} path={manifest.basePath}>
          {manifest.routes.map((route, idx) => {
            const wrapped = applyWrapper(route.element, manifest.wrapper)
            const keyBase = route.path ?? (route.index ? 'index' : 'route')
            const key = `${manifest.key}-${keyBase}-${idx}`
            return route.index ? (
              <Route key={key} index element={wrapped} />
            ) : (
              <Route key={key} path={route.path} element={wrapped} />
            )
          })}
        </Route>
      ))}
    </>
  )
}

export function getDefaultLandingPath(): string {
  return LANDING_PATH
}
