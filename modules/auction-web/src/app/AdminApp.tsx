import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@shared-auth'
import { AdminRoutes } from './router'
import '../styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function AdminApp({ standalone = false }: { standalone?: boolean }) {
  const app = (
    <>
      <AdminRoutes standalone={standalone} />
      <Toaster position="top-right" richColors closeButton />
    </>
  )

  return (
    <QueryClientProvider client={queryClient}>
      {standalone ? <AuthProvider>{app}</AuthProvider> : app}
    </QueryClientProvider>
  )
}
