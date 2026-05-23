import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Navigate, Route, useNavigate } from 'react-router-dom'
import { ProtectedRoute, useAuth, OptimileLogo } from '@shared-auth'
import { ShellAppShell, type ModuleManifest } from '@shared-ui'
import { vendorManifest } from '@vendor/app/manifest'
import { auctionManifest } from '@auction/app/manifest'
import { fleetManifest } from '@fleet/app/manifest'

export const MODULES: ModuleManifest[] = [fleetManifest, auctionManifest, vendorManifest]

const LANDING_PATH = '/fleet/dashboard'

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
  return (
    <ShellAppShell
      modules={MODULES}
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

export function buildShellChildRoutes() {
  return (
    <>
      <Route index element={<Navigate to={LANDING_PATH} replace />} />
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
