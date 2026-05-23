import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, LoginShell, ProtectedRoute } from '@shared-auth'
import { vendorManifest } from './manifest'
import { StandaloneShell } from './StandaloneShell'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  const Wrapper = vendorManifest.wrapper

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginShell />} />
            <Route
              path={vendorManifest.basePath}
              element={
                <ProtectedRoute>
                  <StandaloneShell manifest={vendorManifest} />
                </ProtectedRoute>
              }
            >
              {vendorManifest.routes.map((route, idx) => {
                const wrapped = Wrapper ? <Wrapper>{route.element}</Wrapper> : route.element
                const key = (route.path ?? 'index') + '-' + idx
                return route.index ? (
                  <Route key={key} index element={wrapped} />
                ) : (
                  <Route key={key} path={route.path} element={wrapped} />
                )
              })}
            </Route>
            <Route path="/" element={<Navigate to={vendorManifest.basePath} replace />} />
            <Route path="*" element={<Navigate to={vendorManifest.basePath} replace />} />
          </Routes>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
