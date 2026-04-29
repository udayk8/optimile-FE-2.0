import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { VendorRoutes } from './router'
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

export default function VendorApp({ standalone = false }: { standalone?: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <VendorRoutes standalone={standalone} />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
